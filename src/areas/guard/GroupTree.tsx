import { useState } from 'react';
import { Box, HStack, List, Text } from '@chakra-ui/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AppLink, DirectionalIcon, errorText, IconButton, StatusPill, useAreaRequest } from '@abpjs/ui';
import { guardRoutes, type GuardRoutes } from './routes';
import { useGuardNs } from './texts';
import type { GroupDetailDto, GroupMemberDto } from './types';

export interface GroupTreeProps {
  rootId: string;
  rootName: string;
  rootMembers: GroupMemberDto[];
  /** Where a group's page opens; `guardRoutes()` by default. */
  routes?: GuardRoutes;
}

/** A group's nested member groups, as a tree. Children load when opened; a group met again on its own path is cut off. */
export function GroupTree({ rootId, rootName, rootMembers, routes = guardRoutes() }: GroupTreeProps) {
  return (
    <Box textStyle="md" role="tree" aria-label={rootName}>
      <Text fontWeight="medium">{rootName}</Text>
      <Children members={rootMembers} ancestors={[rootId]} routes={routes} />
    </Box>
  );
}

function Children({ members, ancestors, routes }: { members: GroupMemberDto[]; ancestors: string[]; routes: GuardRoutes }) {
  const t = useGuardNs('groupDetail');
  const groups = members.filter((m) => m.memberType === 'Group');
  const accountCount = members.length - groups.length;
  return (
    <List.Root role="group" listStyle="none" ms="2" ps="3" borderInlineStartWidth="1px" borderColor="border" gap="0.5" py="0.5">
      {groups.map((g) => (
        <Node key={g.memberId} member={g} ancestors={ancestors} routes={routes} />
      ))}
      {accountCount > 0 && (
        <List.Item textStyle="caption" color="fg.muted" ps="6">
          {t('accountCount', { count: accountCount })}
        </List.Item>
      )}
    </List.Root>
  );
}

function Node({ member, ancestors, routes }: { member: GroupMemberDto; ancestors: string[]; routes: GuardRoutes }) {
  const t = useGuardNs('groupDetail');
  const request = useAreaRequest('guard');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<GroupDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cyclic = ancestors.includes(member.memberId);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      try {
        setError(null);
        setDetail(await request<GroupDetailDto>(`/groups/${member.memberId}`));
      } catch (e) {
        setError(errorText(e));
      }
    }
  }

  return (
    <List.Item role="treeitem" aria-expanded={cyclic ? undefined : open} display="block">
      <HStack gap="1">
        {cyclic ? (
          <Box boxSize="control.xs" flexShrink="0" />
        ) : (
          <IconButton
            size="xs"
            aria-label={open ? t('collapse', { name: member.name }) : t('expand', { name: member.name })}
            onClick={toggle}
          >
            {open ? (
              <ChevronDown />
            ) : (
              <DirectionalIcon>
                <ChevronRight />
              </DirectionalIcon>
            )}
          </IconButton>
        )}
        <AppLink href={routes.group(member.memberId)}>{member.name}</AppLink>
        {cyclic && <StatusPill tone="warning">{t('cycle')}</StatusPill>}
      </HStack>
      {open && !cyclic && (
        <Box>
          {error && (
            <Text textStyle="caption" color="fg.danger" ms="7">
              {error}
            </Text>
          )}
          {!detail && !error && (
            <Text textStyle="caption" color="fg.muted" ms="7">
              {t('loadingTree')}
            </Text>
          )}
          {detail && <Children members={detail.members} ancestors={[...ancestors, member.memberId]} routes={routes} />}
        </Box>
      )}
    </List.Item>
  );
}
