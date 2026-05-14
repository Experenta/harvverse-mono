"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Tractor,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";

import { GlassCard } from "@harvverse-monorepo/ui/components/glass-card";
import { Button } from "@harvverse-monorepo/ui/components/button";
import { Input } from "@harvverse-monorepo/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@harvverse-monorepo/ui/components/form";

const registerFarmerSchema = z
  .object({
    fullName: z.string().min(2, "Name required"),
    email: z.string().email("Valid email required"),
    phone: z.string().min(6, "Phone required"),
    country: z.string().min(1, "Country required"),
    password: z.string().min(6, "Min 6 characters"),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFarmerValues = z.infer<typeof registerFarmerSchema>;

const inputClasses =
  "bg-black/20 border-white/10 text-white placeholder:text-gray-600 focus:border-[#a37241]/50 focus:ring-[#a37241]/20";

export default function RegisterFarmerPage() {
  const [isPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RegisterFarmerValues>({
    resolver: zodResolver(registerFarmerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      country: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(_values: RegisterFarmerValues) {
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full"
        >
          <GlassCard className="p-8 border-[#a37241]/20 text-center">
            <div className="w-16 h-16 bg-[#a37241]/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-8 h-8 text-[#a37241]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              Registration Request Submitted
            </h1>
            <p className="text-gray-400 mb-6">
              Your Farmer account request has been submitted successfully. An
              administrator will review and approve your access shortly.
            </p>
            <div className="flex items-center gap-2 justify-center text-sm text-yellow-400/80 bg-yellow-500/10 p-3 rounded-lg mb-6">
              <CheckCircle className="w-4 h-4" />
              <span>You will be able to log in once approved</span>
            </div>
            <Link href="/login" className="block">
              <Button className="w-full bg-gradient-to-r from-[#a37241] to-[#5e3c1e] text-white font-bold h-11 rounded-xl">
                Go to Login
              </Button>
            </Link>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
      <div className="max-w-md w-full">
        <Link href="/">
          <Button
            variant="ghost"
            className="mb-6 text-white/70 hover:text-white pl-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8 border-[#a37241]/20">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 bg-[#a37241]/20 rounded-xl flex items-center justify-center mb-4">
                <Tractor className="w-6 h-6 text-[#a37241]" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Request Farmer Account
              </h1>
              <div className="h-1 w-20 bg-[#a37241] mt-4 rounded-full" />
              <p className="text-gray-400 mt-2 text-center text-sm">
                Apply for funding and partnerships — invitation only
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Perez"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="juan@farm.com"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+504 XXXX XXXX"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Country</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full bg-black/20 border border-white/10 text-white p-2 rounded mt-1 hover:border-white/20 focus:outline-none focus:border-[#a37241]/50"
                          style={{ colorScheme: "dark" }}
                        >
                          <option value="" disabled>
                            Select a country
                          </option>
                          <option value="Honduras">Honduras</option>
                          <option value="Guatemala">Guatemala</option>
                          <option value="Costa Rica">Costa Rica</option>
                          <option value="Nicaragua">Nicaragua</option>
                          <option value="El Salvador">El Salvador</option>
                          <option value="Panama">Panama</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className={inputClasses}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-[#a37241] to-[#5e3c1e] text-white font-bold h-11 hover:shadow-lg hover:shadow-[#a37241]/20 transition-all duration-300 border border-[#a37241]/50 rounded-xl"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    "Submit Registration Request"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <span className="text-gray-500 text-sm">
                Already have an account?{" "}
              </span>
              <Link
                href="/login"
                className="text-[#a37241] hover:underline text-sm"
              >
                Log in
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
