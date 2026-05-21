"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@harvverse-monorepo/ui/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "darker";
}

export function GlassCard({
  children,
  className,
  variant = "default",
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border backdrop-blur-xl shadow-2xl relative overflow-hidden glass-shimmer transition-all duration-300",
        variant === "default" && "bg-white/5 border-white/10 hover:border-white/20",
        variant === "darker" && "bg-black/20 border-white/5 hover:border-white/10",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none opacity-50" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
