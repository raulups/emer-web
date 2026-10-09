import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
  CustomEase.create("outExpo", "0.16,1,0.3,1");
  CustomEase.create("standard", "0.4,0,0.2,1");
  CustomEase.create("inOutQ", "0.65,0,0.35,1");
  CustomEase.create("reveal", "0.2,0.7,0.2,1");
  CustomEase.create("back", "0.34,1.56,0.64,1");
  CustomEase.create("curtain", "0.76,0,0.24,1");
  CustomEase.create("kenBurns", "0.2,0.6,0.2,1");
}

/** Nombres de easing del diseño, registrados con CustomEase. */
export const EASE = {
  outExpo: "outExpo",
  standard: "standard",
  inOutQ: "inOutQ",
  reveal: "reveal",
  back: "back",
  curtain: "curtain",
  kenBurns: "kenBurns",
} as const;

export { gsap, ScrollTrigger, useGSAP };
