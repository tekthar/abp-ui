import type { ReactNode } from 'react';
import { EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** A button or link that resolves the empty state. */
  action?: ReactNode;
  size?: 'sm' | 'md';
}

/** What a list, table or page shows when there is nothing in it. */
export function EmptyState({ title, description, icon, action, size = 'sm' }: EmptyStateProps) {
  return (
    <ChakraEmptyState.Root size={size}>
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator>{icon ?? <Inbox />}</ChakraEmptyState.Indicator>
        <VStack gap="1" textAlign="center">
          <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
          {description != null && <ChakraEmptyState.Description>{description}</ChakraEmptyState.Description>}
        </VStack>
        {action}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  );
}
