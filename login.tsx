import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRequestOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sprout, Phone, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const phoneSchema = z.object({
  phone: z.string().min(10, "10 अंकी मोबाईल नंबर टाका").max(10, "10 अंकीच नंबर टाका"),
  role: z.enum(["shetkari", "buyer"]),
});

const otpSchema = z.object({
  otp: z.string().length(6, "6 अंकी OTP टाका"),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneData, setPhoneData] = useState<PhoneForm | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "", role: "shetkari" },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  function onPhoneSubmit(values: PhoneForm) {
    requestOtp.mutate(
      { data: { phone: values.phone, role: values.role } },
      {
        onSuccess: (data) => {
          setPhoneData(values);
          setDemoOtp(data.otpCode);
          setStep("otp");
          toast({
            title: "OTP तयार झाला",
            description: "खाली OTP दाखवला आहे. खर्‍या SMS साठी SMS सेवा जोडा.",
          });
        },
        onError: () => {
          toast({
            title: "चूक झाली",
            description: "OTP पाठवता आला नाही. पुन्हा प्रयत्न करा.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function onOtpSubmit(values: OtpForm) {
    if (!phoneData) return;
    verifyOtp.mutate(
      { data: { phone: phoneData.phone, otp: values.otp } },
      {
        onSuccess: (data) => {
          login(data.token, data.user as any);
          toast({
            title: "स्वागत आहे!",
            description: `${phoneData.role === "shetkari" ? "शेतकरी" : "खरेदीदार"} म्हणून login झालात.`,
          });
          setLocation("/");
        },
        onError: () => {
          toast({
            title: "चुकीचा OTP",
            description: "OTP चुकीचा किंवा कालबाह्य झाला. पुन्हा प्रयत्न करा.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-3 bg-primary rounded-xl">
              <Sprout className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-serif text-foreground">शेतकरी बाजार</h1>
          <p className="text-muted-foreground mt-1">Direct from Farms</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="bg-primary/5 border-b border-border/60">
            <CardTitle className="text-xl font-serif text-foreground flex items-center gap-2">
              {step === "phone" ? (
                <><Phone className="w-5 h-5" /> Login / Register</>
              ) : (
                <><ShieldCheck className="w-5 h-5" /> OTP Verify करा</>
              )}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "मोबाईल नंबर आणि तुमची भूमिका निवडा"
                : `${phoneData?.phone} वर OTP पाठवला आहे`}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {step === "phone" ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                  {/* Role Selection */}
                  <FormField
                    control={phoneForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">तुम्ही कोण आहात?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 gap-3 mt-2"
                            data-testid="radio-role"
                          >
                            <Label
                              htmlFor="role-shetkari"
                              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                field.value === "shetkari"
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <RadioGroupItem value="shetkari" id="role-shetkari" className="sr-only" />
                              <span className="text-2xl">🌾</span>
                              <div className="text-center">
                                <p className="font-semibold text-foreground">शेतकरी</p>
                                <p className="text-xs text-muted-foreground">Farmer</p>
                              </div>
                            </Label>
                            <Label
                              htmlFor="role-buyer"
                              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                field.value === "buyer"
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <RadioGroupItem value="buyer" id="role-buyer" className="sr-only" />
                              <span className="text-2xl">🛒</span>
                              <div className="text-center">
                                <p className="font-semibold text-foreground">खरेदीदार</p>
                                <p className="text-xs text-muted-foreground">Buyer</p>
                              </div>
                            </Label>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Number */}
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>मोबाईल नंबर</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-md text-muted-foreground text-sm">
                              +91
                            </span>
                            <Input
                              {...field}
                              type="tel"
                              maxLength={10}
                              placeholder="9876543210"
                              className="rounded-l-none"
                              data-testid="input-phone"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-base"
                    disabled={requestOtp.isPending}
                    data-testid="button-request-otp"
                  >
                    {requestOtp.isPending ? "OTP पाठवत आहे..." : "OTP पाठवा"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                {/* Demo OTP Banner */}
                {demoOtp && (
                  <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <span className="font-semibold">Demo OTP: </span>
                      <span className="text-xl font-bold tracking-widest">{demoOtp}</span>
                      <p className="text-xs mt-1 opacity-80">Production मध्ये SMS ने येईल</p>
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>6-अंकी OTP</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="000000"
                              className="text-center text-2xl tracking-widest h-14 font-bold"
                              data-testid="input-otp"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={verifyOtp.isPending}
                      data-testid="button-verify-otp"
                    >
                      {verifyOtp.isPending ? "Verify करत आहे..." : "Login करा"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setStep("phone");
                        setDemoOtp(null);
                        otpForm.reset();
                      }}
                      data-testid="button-back"
                    >
                      नंबर बदला
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
