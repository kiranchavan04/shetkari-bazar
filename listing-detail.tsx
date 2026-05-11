import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetListing,
  useDeleteListing,
  useCreateOrder,
  useGetListingReviews,
  getGetListingQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { getCropDisplay, getGradeDisplay } from "@/lib/constants";
import { StarRating, StarDisplay } from "@/components/star-rating";
import { MapPin, Phone, Scale, Calendar, Package, ArrowLeft, Trash2, ShoppingCart } from "lucide-react";
import Layout from "@/components/layout";
import { format } from "date-fns";

const orderSchema = z.object({
  quantityKg: z.coerce.number().min(0.1, "प्रमाण 0 पेक्षा जास्त हवे"),
  notes: z.string().optional(),
});
type OrderForm = z.infer<typeof orderSchema>;

export default function ListingDetail() {
  const [, params] = useRoute("/listings/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [orderOpen, setOrderOpen] = useState(false);

  const { data: listing, isLoading, isError } = useGetListing(id, {
    query: { enabled: !!id, queryKey: getGetListingQueryKey(id) },
  });

  const { data: reviewData } = useGetListingReviews(id, {
    query: { enabled: !!id, queryKey: ["reviews", "listing", id] },
  });

  const deleteListing = useDeleteListing();
  const createOrder = useCreateOrder();

  const orderForm = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: { quantityKg: 1, notes: "" },
  });

  const isOwner = user?.phone === listing?.farmerPhone;
  const isBuyer = user?.role === "buyer";

  const handleDelete = () => {
    deleteListing.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "यादी काढली!" });
        setLocation("/");
      },
      onError: () => toast({ title: "चूक झाली", description: "यादी काढता आली नाही.", variant: "destructive" }),
    });
  };

  function onOrderSubmit(values: OrderForm) {
    createOrder.mutate(
      { data: { listingId: id, quantityKg: values.quantityKg, notes: values.notes } },
      {
        onSuccess: () => {
          toast({ title: "ऑर्डर दिला!", description: "Dashboard मध्ये UPI payment करा." });
          qc.invalidateQueries({ queryKey: getGetListingQueryKey(id) });
          setOrderOpen(false);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({ title: "ऑर्डर देता आला नाही", description: err?.data?.error || "पुन्हा प्रयत्न करा.", variant: "destructive" });
        },
      }
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="p-8 text-center max-w-2xl mx-auto mt-12 bg-card rounded-xl border border-border">
          <h2 className="text-2xl font-bold text-destructive mb-2">यादी सापडली नाही</h2>
          <p className="text-muted-foreground mb-6">ही यादी काढली गेली असेल किंवा अस्तित्वात नाही.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back">बाजाराकडे परत जा</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 flex-1 max-w-4xl mx-auto w-full">
        <Button variant="ghost" className="mb-6 -ml-4 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> बाजाराकडे परत
        </Button>

        {isLoading || !listing ? (
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-border/60 overflow-hidden">
              <div className="bg-primary/10 p-6 md:p-10 border-b border-border/40 flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground mb-4 text-sm px-3 py-1">
                    {getCropDisplay(listing.crop)}
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-bold font-serif text-foreground" data-testid="text-farmerName">
                    {listing.farmerName}
                  </h1>
                  {reviewData && (
                    <div className="mt-3">
                      <StarDisplay value={reviewData.avgStars} count={reviewData.totalReviews} />
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">भाव</p>
                  <p className="text-5xl font-bold text-primary" data-testid="text-price">
                    ₹{listing.pricePerKg} <span className="text-2xl text-muted-foreground font-normal">/ kg</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">भाव बदलता येणार नाही — शेतकर्‍याने ठरवलेला आहे</p>
                </div>
              </div>

              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
                  <div className="p-6 md:p-8 space-y-6">
                    <h3 className="text-lg font-serif font-bold text-foreground mb-4">मालाची माहिती</h3>
                    <DetailRow icon={Package} label="दर्जा" value={getGradeDisplay(listing.grade)} />
                    <DetailRow icon={Scale} label="उपलब्ध प्रमाण" value={`${listing.quantityKg} kg`} />
                    <DetailRow
                      icon={Calendar}
                      label="यादी टाकली"
                      value={format(new Date(listing.createdAt), "dd MMM yyyy")}
                    />
                    {listing.description && (
                      <div className="pt-4 mt-4 border-t border-border/30">
                        <p className="text-sm font-medium text-muted-foreground mb-2">वर्णन</p>
                        <p className="text-foreground leading-relaxed">{listing.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-6 md:p-8 space-y-6 bg-card/50">
                    <h3 className="text-lg font-serif font-bold text-foreground mb-4">शेतकर्‍याशी संपर्क</h3>
                    <DetailRow icon={MapPin} label="ठिकाण" value={listing.village} />

                    <div className="space-y-3 pt-4">
                      <Button
                        className="w-full h-14 text-base bg-primary hover:bg-primary/90 flex gap-3"
                        asChild
                        data-testid="link-call"
                      >
                        <a href={`tel:${listing.farmerPhone}`}>
                          <Phone className="w-5 h-5" />
                          Call {listing.farmerPhone}
                        </a>
                      </Button>

                      {/* Buyer: Place Order */}
                      {isBuyer && (
                        <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full h-14 text-base gap-3"
                              variant="outline"
                              data-testid="button-order"
                            >
                              <ShoppingCart className="w-5 h-5" />
                              ऑर्डर द्या
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-serif">ऑर्डर द्या</DialogTitle>
                              <DialogDescription>
                                {getCropDisplay(listing.crop)} — {listing.farmerName} — ₹{listing.pricePerKg}/kg
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...orderForm}>
                              <form onSubmit={orderForm.handleSubmit(onOrderSubmit)} className="space-y-4 mt-2">
                                <FormField
                                  control={orderForm.control}
                                  name="quantityKg"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>किती kg हवे? (उपलब्ध: {listing.quantityKg} kg)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="any"
                                          max={listing.quantityKg}
                                          {...field}
                                          data-testid="input-order-qty"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={orderForm.control}
                                  name="notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>नोट (optional)</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="उदा. pickup वेळ, delivery बद्दल..." {...field} data-testid="input-order-notes" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                {orderForm.watch("quantityKg") > 0 && (
                                  <div className="bg-primary/5 rounded-lg p-3 text-sm">
                                    <p className="text-muted-foreground">एकूण रक्कम:</p>
                                    <p className="text-2xl font-bold text-primary">
                                      ₹{(orderForm.watch("quantityKg") * listing.pricePerKg).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">भाव शेतकर्‍याने ठरवला आहे — बदलता येणार नाही</p>
                                  </div>
                                )}
                                <Button type="submit" className="w-full" disabled={createOrder.isPending} data-testid="button-confirm-order">
                                  {createOrder.isPending ? "ऑर्डर देत आहे..." : "ऑर्डर निश्चित करा"}
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Guest: prompt to login */}
                      {!user && (
                        <Button
                          className="w-full h-12"
                          variant="outline"
                          onClick={() => setLocation("/login")}
                          data-testid="button-login-to-order"
                        >
                          ऑर्डर द्यायला Login करा
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>

              {isOwner && (
                <CardFooter className="bg-muted/30 border-t border-border/40 p-4 flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" data-testid="button-delete">
                        <Trash2 className="w-4 h-4 mr-2" /> यादी काढा
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>यादी खरोखर काढायची का?</AlertDialogTitle>
                        <AlertDialogDescription>
                          हे पक्के असेल — यादी कायमची बाजारातून काढली जाईल.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>नको</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
                          {deleteListing.isPending ? "काढत आहे..." : "हो, काढा"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              )}
            </Card>

            {/* Reviews Section */}
            {reviewData && reviewData.totalReviews > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">खरेदीदारांचे अनुभव</CardTitle>
                  <StarDisplay value={reviewData.avgStars} count={reviewData.totalReviews} />
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviewData.reviews.map((review) => (
                    <div key={review.id} className="border-t border-border/40 pt-4 first:border-0 first:pt-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{review.buyerName || "खरेदीदार"}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(review.createdAt), "dd MMM yyyy")}</span>
                      </div>
                      <StarRating value={review.stars} readOnly size="sm" />
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 bg-secondary/10 rounded-md text-secondary mt-0.5">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
