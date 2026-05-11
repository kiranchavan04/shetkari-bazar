import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateListing } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getCropDisplay, getGradeDisplay, CROPS, GRADES } from "@/lib/constants";
import Layout from "@/components/layout";

const formSchema = z.object({
  farmerName: z.string().min(1, "नाव टाका"),
  farmerPhone: z.string().min(10, "10 अंकी मोबाईल नंबर टाका"),
  village: z.string().min(1, "गाव टाका"),
  crop: z.string().min(1, "पीक निवडा"),
  grade: z.enum(["Motha", "Medium", "Golti", "Kharab"], { required_error: "दर्जा निवडा" }),
  quantityKg: z.coerce.number().min(0.1, "प्रमाण 0 पेक्षा जास्त हवे"),
  pricePerKg: z.coerce.number().min(0, "भाव 0 पेक्षा कमी नको"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function List() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const createListing = useCreateListing();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      farmerName: "",
      farmerPhone: user?.phone ?? "",
      village: "",
      crop: "",
      grade: "Medium",
      quantityKg: 100,
      pricePerKg: 10,
      description: "",
    },
  });

  // Pre-fill phone from logged-in user
  useEffect(() => {
    if (user?.phone) {
      form.setValue("farmerPhone", user.phone);
    }
  }, [user, form]);

  function onSubmit(values: FormValues) {
    createListing.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "यादी तयार झाली!", description: "तुमचा माल बाजारात दाखवला जात आहे." });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "चूक झाली", description: "यादी तयार करता आली नाही. पुन्हा प्रयत्न करा.", variant: "destructive" });
      }
    });
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 flex-1 max-w-3xl mx-auto w-full">
        <Card className="border-border/60">
          <CardHeader className="bg-primary/5 border-b border-border/60">
            <CardTitle className="text-2xl font-serif text-foreground">माल यादी टाका</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              तुमच्या मालाची माहिती भरा — खरेदीदार थेट संपर्क करतील.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="farmerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>शेतकर्‍याचे नाव</FormLabel>
                        <FormControl>
                          <Input placeholder="उदा. रमेश पाटील" {...field} data-testid="input-farmerName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="farmerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>मोबाईल नंबर</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="9876543210"
                            {...field}
                            readOnly={!!user?.phone}
                            className={user?.phone ? "bg-muted cursor-not-allowed" : ""}
                            data-testid="input-farmerPhone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="village"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>गाव / ठिकाण</FormLabel>
                      <FormControl>
                        <Input placeholder="उदा. निफाड, नाशिक" {...field} data-testid="input-village" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="crop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>पीक</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-crop">
                              <SelectValue placeholder="पीक निवडा" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CROPS.map(c => (
                              <SelectItem key={c} value={c}>{getCropDisplay(c)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>दर्जा</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-grade">
                              <SelectValue placeholder="दर्जा निवडा" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GRADES.map(g => (
                              <SelectItem key={g} value={g}>{getGradeDisplay(g)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="quantityKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>प्रमाण (Kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} data-testid="input-quantityKg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>भाव (₹ प्रति Kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} data-testid="input-pricePerKg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>अतिरिक्त माहिती (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="मालाबद्दल विशेष माहिती, पॅकेजिंग, pickup बद्दल..."
                          className="resize-none"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full text-lg h-12"
                  disabled={createListing.isPending}
                  data-testid="button-submit"
                >
                  {createListing.isPending ? "टाकत आहे..." : "माल यादीत टाका"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
