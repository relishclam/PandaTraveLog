import React from 'react';
import { motion, type Transition, type Variants } from 'framer-motion';

// Define common motion props type to be reused
type CommonMotionProps = {
  variants?: Variants;
  initial?: string | object;
  animate?: string | object;
  exit?: string | object;
  transition?: Transition;
  whileHover?: object;
  whileTap?: object;
  whileFocus?: object;
  whileInView?: object;
  custom?: any;
  style?: React.CSSProperties;
  className?: string;
  ref?: React.RefObject<any>;
};

// Export typed motion components
export const MotionDiv = motion.div as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & CommonMotionProps
>;

export const MotionButton = motion.button as React.ComponentType<
  React.ButtonHTMLAttributes<HTMLButtonElement> & CommonMotionProps
>;

export const MotionSpan = motion.span as React.ComponentType<
  React.HTMLAttributes<HTMLSpanElement> & CommonMotionProps
>;

export const MotionP = motion.p as React.ComponentType<
  React.HTMLAttributes<HTMLParagraphElement> & CommonMotionProps
>;

export const MotionA = motion.a as React.ComponentType<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & CommonMotionProps
>;

export const MotionImg = motion.img as React.ComponentType<
  React.ImgHTMLAttributes<HTMLImageElement> & CommonMotionProps
>;

export const MotionUl = motion.ul as React.ComponentType<
  React.HTMLAttributes<HTMLUListElement> & CommonMotionProps
>;

export const MotionLi = motion.li as React.ComponentType<
  React.HTMLAttributes<HTMLLIElement> & CommonMotionProps
>;

export const MotionHeader = motion.header as React.ComponentType<
  React.HTMLAttributes<HTMLElement> & CommonMotionProps
>;

export const MotionFooter = motion.footer as React.ComponentType<
  React.HTMLAttributes<HTMLElement> & CommonMotionProps
>;

export const MotionSection = motion.section as React.ComponentType<
  React.HTMLAttributes<HTMLElement> & CommonMotionProps
>;

export const MotionNav = motion.nav as React.ComponentType<
  React.HTMLAttributes<HTMLElement> & CommonMotionProps
>;

export const MotionH1 = motion.h1 as React.ComponentType<
  React.HTMLAttributes<HTMLHeadingElement> & CommonMotionProps
>;

export const MotionH2 = motion.h2 as React.ComponentType<
  React.HTMLAttributes<HTMLHeadingElement> & CommonMotionProps
>;

export const MotionH3 = motion.h3 as React.ComponentType<
  React.HTMLAttributes<HTMLHeadingElement> & CommonMotionProps
>;

export const MotionH4 = motion.h4 as React.ComponentType<
  React.HTMLAttributes<HTMLHeadingElement> & CommonMotionProps
>;

// Convenience export that includes all the motion components
export const Motion = {
  Div: MotionDiv,
  Button: MotionButton,
  Span: MotionSpan,
  P: MotionP,
  A: MotionA,
  Img: MotionImg,
  Ul: MotionUl,
  Li: MotionLi,
  Header: MotionHeader,
  Footer: MotionFooter,
  Section: MotionSection,
  Nav: MotionNav,
  H1: MotionH1,
  H2: MotionH2,
  H3: MotionH3,
  H4: MotionH4
};
