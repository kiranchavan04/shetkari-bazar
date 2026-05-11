import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  useListListings,
  useDeleteListing,
  useGetMyOrders,
  useUpdateOrder,
  useUpdateProfile,
  useCreateReview,
  getGetMyOrdersQueryKey,
  getListListingsQueryKey,
  OrderUpdateStatus,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getCropDisplay, getGradeDisplay } from "@/lib/constants";
import { StarRating } from "@/components/star-rating";
import {
  User, Pencil, Wallet, Package, IndianRupee, ShoppingCart,
  Trash2, CheckCircle, XCircle, Clock, Link as LinkIcon, Star,
} from "lucide-react";
import { format } from "date-fns";

const profileSchema = z.object({
  name: z.string().min(1, "नाव टाका"),
  upiId: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const upiRefSchema = z.object({
  upiTxnRef: z.string().min(6, "Valid UPI reference number टाका"),
});
type UpiRefForm = z.infer<typeof upiRefSchema>;

const reviewSchema = z.object({
  stars: z.number().min(1).max(5),
  comment: z.string().optional(),
});
type ReviewForm = z.infer<typeof reviewSchema>;

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "प्रतीक्षेत", className: "bg-amber-100 text-amber-800 border-amber-300" },
    paid: { label: "पैसे दिले", className: "bg-blue-100 text-blue-800 border-blue-300" },
    confirmed: { label: "पक्के", className: "bg-green-100 text-green-800 border-green-300" },
    cancelled: { label: "रद्द", className: "bg-red-100 text-red-800 border-red-300" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

export default function Dashboard() {
  const { user, login, token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const isFarmer = user?.role === "shetkari";

  const { data: listings, isLoading: loadingListings } = useListListings(
    isFarmer ? { village: undefined } : undefined,
    { query: { queryKey: getListListingsQueryKey() } }
  );

  const myListings = listings?.filter((l) => l.farmerPhone === user?.phone) ?? [];

  const { data: orders, isLoading: loadingOrders } = useGetMyOrders({
    query: { queryKey: getGetMyOrdersQueryKey() },
  });

  const deleteListing = useDeleteListing();
  const updateOrder = useUpdateOrder();
  const updateProfile = useUpdateProfile();
  const createReview = useCreateReview();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", upiId: user?.upiId ?? "" },
  });

  function onProfileSave(values: ProfileForm) {
    updateProfile.mutate(
      { data: { name: values.name, upiId: values.upiId } },
      {
        onSuccess: (updated) => {
          if (token) login(token, updated as any);
          toast({ title: "Profile अपडेट झाली!" });
          setProfileOpen(false);
        },
        onError: () => toast({ title: "चूक झाली", variant: "destructive" }),
      }
    );
  }

  function handleDeleteListing(id: number) {
    deleteListing.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListListingsQueryKey() });
        toast({ title: "यादी काढली!" });
      },
      onError: () => toast({ title: "चूक झाली", variant: "destructive" }),
    });
  }

  function handleOrderStatus(orderId: number, status: OrderUpdateStatus) {
    updateOrder.mutate(
      { id: orderId, data: { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
          toast({ title: status === "confirmed" ? "ऑर्डर पक्का केला!" : "ऑर्डर रद्द केला" });
        },
        onError: () => toast({ title: "चूक झाली", variant: "destructive" }),
      }
    );
  }

  const pendingOrdersCount = orders?.filter((o) => o.status === "pending" || o.status === "paid").length ?? 0;
  const confirmedRevenue = orders
    ?.filter((o) => o.status === "confirmed")
    .reduce((sum, o) => sum + o.totalAmount, 0) ?? 0;

  return (
    <Layout>
      <div className="p-4 md:p-8 flex-1 max-w-5xl mx-auto w-full space-y-6">

        {/* Profile Card */}
        <Card className="border-border/60">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">
                  {user?.name || <span className="text-muted-foreground italic">नाव नाही</span>}
                </p>
                <p className="text-muted-foreground text-sm">+91 {user?.phone}</p>
                <Badge className={`mt-1 text-xs ${isFarmer ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {isFarmer ? "शेतकरी" : "खरेदीदार"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {isFarmer && (
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span>UPI: <span className="text-foreground font-medium">{user?.upiId || <span className="italic text-muted-foreground">सेट नाही</span>}</span></span>
                </div>
              )}
              <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-edit-profile">
                    <Pencil className="w-3.5 h-3.5" /> Profile बदला
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Profile अपडेट करा</DialogTitle>
                  </DialogHeader>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4 mt-2">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>तुमचे नाव</FormLabel>
                            <FormControl>
                              <Input placeholder="उदा. रमेश पाटील" {...field} data-testid="input-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isFarmer && (
                        <FormField
                          control={profileForm.control}
                          name="upiId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>UPI ID (payments साठी)</FormLabel>
                              <FormControl>
                                <Input placeholder="उदा. ramesh@upi किंवा 9876543210@paytm" {...field} data-testid="input-upiId" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <Button type="submit" className="w-full" disabled={updateProfile.isPending} data-testid="button-save-profile">
                        {updateProfile.isPending ? "जतन करत आहे..." : "जतन करा"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {isFarmer ? (
            <>
              <SummaryCard icon={Package} label="माझ्या याद्या" value={myListings.length} color="text-primary" />
              <SummaryCard icon={ShoppingCart} label="प्रलंबित ऑर्डर" value={pendingOrdersCount} color="text-amber-600" />
              <SummaryCard icon={IndianRupee} label="एकूण मिळकत" value={`₹${confirmedRevenue.toFixed(0)}`} color="text-green-600" />
            </>
          ) : (
            <>
              <SummaryCard icon={ShoppingCart} label="एकूण ऑर्डर" value={orders?.length ?? 0} color="text-primary" />
              <SummaryCard icon={Clock} label="प्रतीक्षेत" value={orders?.filter(o => o.status === "pending").length ?? 0} color="text-amber-600" />
              <SummaryCard icon={CheckCircle} label="पक्के ऑर्डर" value={orders?.filter(o => o.status === "confirmed").length ?? 0} color="text-green-600" />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={isFarmer ? "listings" : "orders"}>
          <TabsList className="w-full md:w-auto">
            {isFarmer && <TabsTrigger value="listings" data-testid="tab-listings">माझ्या याद्या</TabsTrigger>}
            <TabsTrigger value="orders" data-testid="tab-orders">{isFarmer ? "ऑर्डर" : "माझे ऑर्डर"}</TabsTrigger>
          </TabsList>

          {/* Farmer: My Listings */}
          {isFarmer && (
            <TabsContent value="listings" className="mt-4 space-y-3">
              {loadingListings ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
              ) : myListings.length === 0 ? (
                <EmptyState message="अजून कोणतीही यादी नाही. माल टाका!" action={() => setLocation("/list")} actionLabel="माल टाका" />
              ) : (
                myListings.map((listing) => (
                  <Card key={listing.id} className="border-border/60" data-testid={`card-listing-${listing.id}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <Badge variant="secondary" className="shrink-0">{getCropDisplay(listing.crop)}</Badge>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{listing.village}</p>
                          <p className="text-sm text-muted-foreground">{getGradeDisplay(listing.grade)} &bull; {listing.quantityKg} kg</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-lg font-bold text-primary">₹{listing.pricePerKg}/kg</p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" data-testid={`button-delete-${listing.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>यादी काढायची का?</AlertDialogTitle>
                              <AlertDialogDescription>हे पक्के असेल — यादी कायमची काढली जाईल.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>नको</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteListing(listing.id)} className="bg-destructive text-destructive-foreground">
                                हो, काढा
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )}

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4 space-y-3">
            {loadingOrders ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
            ) : !orders || orders.length === 0 ? (
              <EmptyState message={isFarmer ? "अजून कोणताही ऑर्डर नाही." : "तुम्ही अजून कोणताही ऑर्डर दिला नाही."} />
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="border-border/60" data-testid={`card-order-${order.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{getCropDisplay(order.crop)}</Badge>
                          <Badge variant="outline" className="text-muted-foreground">{getGradeDisplay(order.grade)}</Badge>
                          {statusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.quantityKg} kg &bull; {order.village} &bull; {format(new Date(order.createdAt), "dd MMM yyyy")}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-primary shrink-0">₹{order.totalAmount.toFixed(0)}</p>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {isFarmer
                        ? <span>खरेदीदार: <span className="text-foreground font-medium">{order.buyerName || order.buyerPhone}</span> &bull; {order.buyerPhone}</span>
                        : <span>शेतकरी: <span className="text-foreground font-medium">{order.farmerName}</span> &bull; {order.farmerPhone}</span>
                      }
                    </div>

                    {order.upiTxnRef && (
                      <p className="text-xs text-muted-foreground">UPI Ref: <span className="font-mono text-foreground">{order.upiTxnRef}</span></p>
                    )}

                    {/* Buyer: Pay for pending orders */}
                    {!isFarmer && order.status === "pending" && (
                      <BuyerPayPanel order={order} onPaid={(ref) => {
                        updateOrder.mutate(
                          { id: order.id, data: { status: "paid", upiTxnRef: ref } },
                          {
                            onSuccess: () => {
                              qc.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
                              toast({ title: "Payment confirm केले!" });
                            },
                            onError: () => toast({ title: "चूक झाली", variant: "destructive" }),
                          }
                        );
                      }} />
                    )}

                    {/* Buyer: Review after confirmed */}
                    {!isFarmer && order.status === "confirmed" && (
                      <ReviewPrompt
                        orderId={order.id}
                        farmerName={order.farmerName}
                        onSubmit={(stars, comment) => {
                          createReview.mutate(
                            { data: { orderId: order.id, stars, comment } },
                            {
                              onSuccess: () => {
                                qc.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
                                toast({ title: "रेटिंग दिली! धन्यवाद." });
                              },
                              onError: (err: any) => {
                                const msg = err?.response?.data?.error ?? "चूक झाली";
                                if (msg.includes("Already reviewed")) {
                                  toast({ title: "हे रेटिंग आधीच दिले आहे." });
                                } else {
                                  toast({ title: msg, variant: "destructive" });
                                }
                              },
                            }
                          );
                        }}
                      />
                    )}

                    {/* Farmer Actions */}
                    {isFarmer && (order.status === "pending" || order.status === "paid") && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleOrderStatus(order.id, OrderUpdateStatus.confirmed)}
                          disabled={updateOrder.isPending}
                          data-testid={`button-confirm-${order.id}`}
                        >
                          <CheckCircle className="w-4 h-4" /> पक्के करा
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => handleOrderStatus(order.id, OrderUpdateStatus.cancelled)}
                          disabled={updateOrder.isPending}
                          data-testid={`button-cancel-${order.id}`}
                        >
                          <XCircle className="w-4 h-4" /> रद्द करा
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function BuyerPayPanel({ order, onPaid }: { order: any; onPaid: (ref: string) => void }) {
  const [showRefInput, setShowRefInput] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const form = useForm<UpiRefForm>({
    resolver: zodResolver(upiRefSchema),
    defaultValues: { upiTxnRef: "" },
  });

  const upiLink = order.farmerUpiId
    ? `upi://pay?pa=${encodeURIComponent(order.farmerUpiId)}&pn=${encodeURIComponent(order.farmerName)}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=ShetkariOrder${order.id}`
    : null;

  useEffect(() => {
    if (!upiLink) return;
    QRCode.toDataURL(upiLink, { width: 200, margin: 2, color: { dark: "#166534", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [upiLink]);

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 space-y-3">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">UPI Payment बाकी आहे</p>
      <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
        <p>शेतकरी: <span className="font-bold">{order.farmerName}</span></p>
        {order.farmerUpiId
          ? <p>UPI ID: <span className="font-mono font-bold">{order.farmerUpiId}</span></p>
          : <p className="italic">शेतकर्‍याने UPI ID सेट केला नाही — थेट call करा: {order.farmerPhone}</p>
        }
        <p>रक्कम: <span className="font-bold text-lg">₹{order.totalAmount.toFixed(2)}</span></p>
      </div>

      {/* QR Code */}
      {qrDataUrl && (
        <div className="flex flex-col items-center gap-2 py-2">
          <img src={qrDataUrl} alt="UPI QR Code" className="w-40 h-40 rounded-lg border border-amber-200" />
          <p className="text-xs text-amber-700 dark:text-amber-300">PhonePe / GPay / Paytm ने scan करा</p>
        </div>
      )}

      {upiLink && (
        <Button
          size="sm"
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => window.open(upiLink, "_blank")}
          data-testid={`button-upi-pay-${order.id}`}
        >
          <LinkIcon className="w-4 h-4" /> UPI App मध्ये Pay करा
        </Button>
      )}

      {!showRefInput ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setShowRefInput(true)}
          data-testid={`button-enter-ref-${order.id}`}
        >
          Payment केले — Reference नंबर द्या
        </Button>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onPaid(v.upiTxnRef))} className="space-y-2">
            <FormField
              control={form.control}
              name="upiTxnRef"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="UPI Transaction ID / Reference" {...field} className="text-sm" data-testid={`input-txn-ref-${order.id}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">Confirm करा</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowRefInput(false)}>रद्द</Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

function ReviewPrompt({ orderId, farmerName, onSubmit }: { orderId: number; farmerName: string; onSubmit: (stars: number, comment?: string) => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 text-center">
        <p className="text-sm text-green-800 dark:text-green-300 font-medium">रेटिंग दिल्याबद्दल धन्यवाद!</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-3 space-y-3">
      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
        <Star className="w-4 h-4 inline mr-1 fill-amber-400 text-amber-400" />
        {farmerName} यांना रेटिंग द्या
      </p>
      <StarRating value={stars} onChange={setStars} size="lg" />
      <Textarea
        placeholder="अनुभव कसा होता? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="text-sm resize-none"
        rows={2}
        data-testid={`input-review-comment-${orderId}`}
      />
      <Button
        size="sm"
        className="w-full"
        disabled={stars === 0}
        onClick={() => {
          onSubmit(stars, comment || undefined);
          setSubmitted(true);
        }}
        data-testid={`button-submit-review-${orderId}`}
      >
        रेटिंग पाठवा
      </Button>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-6 h-6 ${color} shrink-0`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message, action, actionLabel }: { message: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
      <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-muted-foreground">{message}</p>
      {action && actionLabel && (
        <Button className="mt-4" onClick={action}>{actionLabel}</Button>
      )}
    </div>
  );
}
