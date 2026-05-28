import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageLayout from "@/components/PageLayout";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ArrowRight, Shield, Clock, Users } from "lucide-react";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","District of Columbia",
];

const schema = z.object({
  name:    z.string().min(1, "Name is required").max(200),
  firm:    z.string().max(300).optional(),
  email:   z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone:   z.string().max(40).optional(),
  state:   z.string().optional(),
  message: z.string().max(5000).optional(),
});

type FormValues = z.infer<typeof schema>;

function SuccessState() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-12">
      <div className="w-16 h-16 rounded-full bg-[oklch(97%_0.02_255)] border-2 border-[oklch(50%_0.16_255)] flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-[oklch(50%_0.16_255)]" />
      </div>
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[oklch(20%_0.05_255)] mb-3">
          Request received
        </h2>
        <p className="text-[oklch(46%_0.015_255)] leading-relaxed max-w-md">
          Thank you for your interest in Legal Intake Flow. Our team will review your
          information and reach out within 1–2 business days to discuss next steps.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-[oklch(58%_0.015_255)]">
        <p>Check your inbox for a confirmation email.</p>
        <p>Questions? Email us at <a href="mailto:partners@legalintakeflow.com" className="text-[oklch(50%_0.16_255)] hover:underline">partners@legalintakeflow.com</a></p>
      </div>
    </div>
  );
}

export default function RequestAccess() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submitMutation = trpc.partnerAccess.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const onSubmit = (data: FormValues) => {
    submitMutation.mutate({
      name:    data.name,
      firm:    data.firm || undefined,
      email:   data.email,
      phone:   data.phone || undefined,
      state:   selectedState || undefined,
      message: data.message || undefined,
    });
  };

  return (
    <PageLayout>
      {/* Page header */}
      <section className="bg-[oklch(20%_0.05_255)] py-20">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(66%_0.15_255)] mb-4">
              Partner Network
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-5 leading-tight">
              Request Partner Access
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Tell us about your practice and we will reach out to discuss fit, volume,
              and onboarding into the Legal Intake Flow partner network.
            </p>
          </div>
        </div>
      </section>

      {/* Form + sidebar */}
      <section className="section-py bg-[oklch(97%_0.02_255)]">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[oklch(50%_0.16_255)] mb-4">
                  What to expect
                </p>
                <div className="flex flex-col gap-5">
                  {[
                    {
                      icon: Clock,
                      title: "1–2 business day response",
                      body: "Our team reviews every application and responds promptly.",
                    },
                    {
                      icon: Users,
                      title: "Personalized onboarding",
                      body: "We configure your routing profile based on your practice area and capacity.",
                    },
                    {
                      icon: Shield,
                      title: "No obligation",
                      body: "Submitting a request does not commit you to any agreement.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[oklch(92%_0.01_255)] flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-[oklch(50%_0.16_255)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[oklch(20%_0.05_255)] mb-0.5">{item.title}</p>
                        <p className="text-xs text-[oklch(58%_0.015_255)] leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[oklch(92%_0.01_255)]">
                <p className="text-xs font-semibold text-[oklch(20%_0.05_255)] mb-2">Questions?</p>
                <p className="text-xs text-[oklch(58%_0.015_255)] leading-relaxed">
                  Email us at{" "}
                  <a href="mailto:partners@legalintakeflow.com" className="text-[oklch(50%_0.16_255)] hover:underline">
                    partners@legalintakeflow.com
                  </a>
                </p>
              </div>
            </div>

            {/* Form card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[oklch(92%_0.01_255)] shadow-[var(--shadow-md)] p-8 md:p-10">
              {submitted ? (
                <SuccessState />
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="name" className="text-sm font-medium text-[oklch(28%_0.012_255)]">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Jane Smith"
                        {...register("name")}
                        className={`h-10 rounded-lg border-[oklch(86%_0.012_255)] text-sm focus:ring-2 focus:ring-[oklch(50%_0.16_255)] focus:border-transparent ${errors.name ? "border-red-400" : ""}`}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Firm */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="firm" className="text-sm font-medium text-[oklch(28%_0.012_255)]">
                        Firm or Organization
                      </Label>
                      <Input
                        id="firm"
                        placeholder="Smith & Associates"
                        {...register("firm")}
                        className="h-10 rounded-lg border-[oklch(86%_0.012_255)] text-sm"
                      />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="email" className="text-sm font-medium text-[oklch(28%_0.012_255)]">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@smithlaw.com"
                        {...register("email")}
                        className={`h-10 rounded-lg border-[oklch(86%_0.012_255)] text-sm ${errors.email ? "border-red-400" : ""}`}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="phone" className="text-sm font-medium text-[oklch(28%_0.012_255)]">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 000-0000"
                        {...register("phone")}
                        className="h-10 rounded-lg border-[oklch(86%_0.012_255)] text-sm"
                      />
                    </div>

                    {/* State */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label htmlFor="state" className="text-sm font-medium text-[oklch(28%_0.012_255)]">
                        Primary State of Practice
                      </Label>
                      <Select
                        value={selectedState}
                        onValueChange={(val) => {
                          setSelectedState(val);
                          setValue("state", val);
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-lg border-[oklch(86%_0.012_255)] text-sm">
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="message" className="text-sm font-medium text-[oklch(28%_0.012_255)]">
                      Tell us about your practice
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Describe your disability practice, typical case volume, and what you are looking for in a lead partner..."
                      rows={5}
                      {...register("message")}
                      className="rounded-lg border-[oklch(86%_0.012_255)] text-sm resize-none"
                    />
                  </div>

                  {/* Error message */}
                  {submitMutation.isError && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      Something went wrong. Please try again or email us directly.
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="bg-[oklch(20%_0.05_255)] hover:bg-[oklch(26%_0.06_255)] text-white rounded-xl h-11 text-sm font-semibold shadow-sm w-full sm:w-auto sm:self-start px-8"
                  >
                    {submitMutation.isPending ? "Submitting…" : "Submit Request"}
                    {!submitMutation.isPending && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>

                  <p className="text-xs text-[oklch(58%_0.015_255)]">
                    By submitting this form, you agree to our{" "}
                    <a href="/privacy" className="text-[oklch(50%_0.16_255)] hover:underline">Privacy Policy</a>{" "}
                    and{" "}
                    <a href="/terms" className="text-[oklch(50%_0.16_255)] hover:underline">Terms of Use</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
