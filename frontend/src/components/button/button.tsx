import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import styles from "./button.module.scss";


const buttonStyles = cva(styles.button, {
  variants: {
    variant: {
      primary: styles.buttonPrimary,
      secondary: styles.buttonSecondary,
    },
    size: {
      sm: styles.buttonSmall,
      md: styles.buttonMedium,
      lg: styles.buttonLarge,
    },
		arrow: {
			true: styles.buttonArrow,
      false: "",
		},
    shadow: {
      true: styles.buttonShadow,
      false: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
		arrow: false,
    shadow: false,
  },
});

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    children: React.ReactNode;
    className?: string;
  };

export default function Button({
  variant,
  size,
	arrow,
  shadow,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(buttonStyles({ variant, size, arrow, shadow }), className)}
      {...props}
    >
      {children}
    </button>
  );
}