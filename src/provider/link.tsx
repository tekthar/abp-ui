import { createContext, forwardRef, useContext, type AnchorHTMLAttributes, type ElementType, type ReactNode } from 'react';
import { Link as ChakraLink, type LinkProps as ChakraLinkProps } from '@chakra-ui/react';

/**
 * The host's router link (next/link in the shell). Components that render links use it so
 * navigation stays client-side, without the package importing a router.
 */
export type LinkComponent = ElementType<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }>;

const LinkContext = createContext<LinkComponent>('a');

export function LinkComponentProvider({ value, children }: { value?: LinkComponent; children: ReactNode }) {
  return <LinkContext.Provider value={value ?? 'a'}>{children}</LinkContext.Provider>;
}

export function useLinkComponent(): LinkComponent {
  return useContext(LinkContext);
}

export interface AppLinkProps extends Omit<ChakraLinkProps, 'href' | 'asChild'> {
  href: string;
}

/** A styled link that navigates with the host's router. */
export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink({ href, children, ...rest }, ref) {
  const Comp = useLinkComponent();
  return (
    <ChakraLink asChild {...rest}>
      <Comp href={href} ref={ref}>
        {children}
      </Comp>
    </ChakraLink>
  );
});
