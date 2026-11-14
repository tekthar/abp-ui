import { memo, useMemo, useState } from 'react';
import dagre from '@dagrejs/dagre';
import { Background, BackgroundVariant, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { Box, chakra, Grid, HStack, Stack, Text } from '@chakra-ui/react';
import { DataTable, InlineAlert, SearchInput, SelectField, StatusPill, useApiQuery, useColorMode, useFormatters, useTokenVar } from '@abpjs/ui';
import { ItemLink, useDebounced } from './links';
import { useAgentTexts } from './texts';
import { num, type AgentGraphLink, type AgentGraphNote, type AgentGraphPage, type AgentGraphThing } from './types';

const WIDTH = 168;
const HEIGHT = 40;

/** Relations name the lines while they're few enough to read. */
const LABELLED_EDGES = 8;

/** A relation as the model named it (WORKS_AT), in words: "works at". */
const relationWords = (relation: string) => relation.toLowerCase().replaceAll('_', ' ');

type ThingNodeData = { thing: AgentGraphThing; picked: boolean };
type ThingNodeType = Node<ThingNodeData, 'thing'>;

/** A thing in the picture: its name; the one picked stands out. */
const ThingNode = memo(function ThingNode({ data }: NodeProps<ThingNodeType>) {
  const { thing, picked } = data;
  return (
    <Box w={`${WIDTH}px`} h={`${HEIGHT}px`} display="flex" alignItems="center" px="3" bg="bg.panel" borderWidth={picked ? '2px' : '1px'}
      borderColor={picked ? 'border.accent' : 'border.emphasized'} rounded="l2" shadow={picked ? 'sm' : 'xs'} cursor={picked ? 'default' : 'pointer'}
      data-graph-thing={thing.name}>
      <Text textStyle="body.sm" fontWeight={picked ? 'semibold' : 'medium'} truncate dir="auto" title={thing.name}>{thing.name}</Text>
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} isConnectable={false} style={{ opacity: 0 }} />
    </Box>
  );
});

const nodeTypes = { thing: ThingNode };

/** The picked thing among the things its facts reach, left to right as the facts read (dagre). */
function layout(thing: AgentGraphThing, around: AgentGraphThing[], facts: AgentGraphLink[], color: (path: string) => string): { nodes: ThingNodeType[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: 'LR', nodesep: 16, ranksep: 110, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  const things = [thing, ...around.filter((a) => a.id !== thing.id)];
  const ids = new Set(things.map((x) => x.id));
  for (const x of things) g.setNode(x.id, { width: WIDTH, height: HEIGHT });
  const drawn = facts.filter((f) => ids.has(f.from) && ids.has(f.to) && f.from !== f.to);
  drawn.forEach((f) => g.setEdge(f.from, f.to, {}, f.id));
  dagre.layout(g);
  return {
    nodes: things.map((x) => {
      const placed = g.node(x.id);
      return {
        id: x.id,
        type: 'thing',
        position: { x: Math.round(placed.x - WIDTH / 2), y: Math.round(placed.y - HEIGHT / 2) },
        data: { thing: x, picked: x.id === thing.id },
        draggable: false,
        connectable: false,
      };
    }),
    edges: drawn.map((f) => ({
      id: f.id,
      source: f.from,
      target: f.to,
      label: drawn.length <= LABELLED_EDGES ? relationWords(f.relation) : undefined,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: color('colors.border.emphasized'), strokeDasharray: f.invalidAt ? '4 4' : undefined },
      labelStyle: { fontSize: 11, fill: color('colors.fg.muted') },
      labelBgStyle: { fill: color('colors.bg.panel') },
    })),
  };
}

function Picture({ thing, around, facts, onPick }: { thing: AgentGraphThing; around: AgentGraphThing[]; facts: AgentGraphLink[]; onPick: (id: string) => void }) {
  const t = useAgentTexts();
  const { colorMode } = useColorMode();
  const color = useTokenVar();
  const { nodes, edges } = useMemo(() => layout(thing, around, facts, color), [thing, around, facts, color]);
  return (
    <Box h="16rem" dir="ltr" bg="bg.canvas" borderWidth="1px" borderColor="border" rounded="l2" css={{ '& .react-flow': { '--xy-background-color': 'transparent' } }}
      role="img" aria-label={t('graph.picture', { name: thing.name, count: around.length })} data-testid="agent-graph-picture">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} colorMode={colorMode === 'dark' ? 'dark' : 'light'}
        onNodeClick={(_, node) => { if (node.id !== thing.id) onPick(node.id); }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        deleteKeyCode={null} minZoom={0.3} maxZoom={1.5} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color={color('colors.border.emphasized')} />
      </ReactFlow>
    </Box>
  );
}

/** One thing: what its notes say of it, the picture of it and what its facts reach, and its facts with their notes. */
function ThingDetail({ page, onPick }: { page: AgentGraphPage; onPick: (id: string) => void }) {
  const t = useAgentTexts();
  const fmt = useFormatters();
  const view = page.view;
  const thing = view.thing!;
  const names = useMemo(() => new Map([thing, ...view.around].map((x) => [x.id, x.name])), [thing, view.around]);
  const notes = useMemo(() => new Map(page.notes.map((n) => [n.id, n])), [page.notes]);
  return (
    <Stack gap="3" minW="0" data-testid="agent-graph-thing">
      <Stack gap="1">
        <HStack gap="2" wrap="wrap">
          <Text fontWeight="semibold" dir="auto">{thing.name}</Text>
          <Text textStyle="caption" color="fg.muted">{t('graph.factCount', { count: num(thing.facts) })}</Text>
        </HStack>
        {thing.summary && <Text textStyle="body.sm" color="fg.muted" dir="auto" whiteSpace="pre-wrap">{thing.summary}</Text>}
      </Stack>
      {view.around.length > 0 && <Picture key={thing.id} thing={thing} around={view.around} facts={view.facts} onPick={onPick} />}
      <DataTable<AgentGraphLink>
        rows={view.facts}
        getRowId={(f) => f.id}
        size="sm"
        aria-label={t('graph.facts')}
        empty={t('graph.noFacts')}
        columns={[
          {
            id: 'fact',
            header: t('graph.fact'),
            cell: (f) => (
              <Stack gap="0.5" alignItems="flex-start">
                <Text dir="auto" whiteSpace="pre-wrap" color={f.invalidAt ? 'fg.muted' : undefined}>{f.fact}</Text>
                {f.invalidAt && <StatusPill tone="neutral" dot={false}>{t('graph.replaced', { date: fmt.dateTime(f.invalidAt, { dateStyle: 'medium' }) })}</StatusPill>}
              </Stack>
            ),
          },
          {
            id: 'with',
            header: t('graph.with'),
            cell: (f) => {
              const other = f.from === thing.id ? f.to : f.from;
              const name = names.get(other);
              return name ? (
                <chakra.button type="button" textAlign="start" color="fg.accent" whiteSpace="nowrap" cursor="pointer" _hover={{ textDecoration: 'underline' }} dir="auto"
                  onClick={() => onPick(other)}>
                  {name}
                </chakra.button>
              ) : '';
            },
          },
          { id: 'since', header: t('graph.since'), cell: (f) => <Text textStyle="caption" whiteSpace="nowrap">{fmt.dateTime(f.validAt ?? f.createdAt, { dateStyle: 'medium' })}</Text> },
          {
            id: 'from',
            header: t('graph.from'),
            cell: (f) => (
              <Stack gap="1">
                {f.memories.map((id) => notes.get(id)).filter((n): n is AgentGraphNote => !!n).map((n) => (
                  <Stack key={n.id} gap="0">
                    <ItemLink kind={n.itemKind} itemKey={n.itemKey} textStyle="caption" />
                    <Text textStyle="caption" color="fg.muted" dir="auto" lineClamp={2} title={n.text}>{n.text}</Text>
                    {n.outside && <StatusPill tone="warning" dot={false}>{t('graph.outside')}</StatusPill>}
                  </Stack>
                ))}
              </Stack>
            ),
          },
        ]}
      />
      {num(view.hidden) > 0 && <Text textStyle="caption" color="fg.muted">{t('graph.hidden', { count: num(view.hidden) })}</Text>}
    </Stack>
  );
}

/**
 * What an agent knows, as a graph, for its admins: in one scope, the things its notes name (most connected first, or
 * those whose names or facts have the words), and around the one picked, a picture of it and the things its facts
 * reach, and its facts with the notes they came from. Only what comes from notes the reader may read shows. Reading it
 * calls no model. The picture is React Flow's: a host imports '@xyflow/react/dist/style.css' once.
 */
export function AgentGraph({ agentId, scopes }: { agentId: string; scopes: string[] }) {
  const t = useAgentTexts();
  const [scope, setScope] = useState(scopes[0] ?? '');
  const [find, setFind] = useState('');
  const [thing, setThing] = useState<string | null>(null);
  const words = useDebounced(find.trim(), 300);
  const query = new URLSearchParams({ scope });
  if (words) query.set('find', words);
  if (thing) query.set('thing', thing);
  const graph = useApiQuery<AgentGraphPage>('agent', scope ? `/agents/${agentId}/graph?${query}` : null);
  const data = graph.data;

  if (scopes.length === 0) return <Text textStyle="body.sm" color="fg.muted">{t('graph.empty')}</Text>;
  return (
    <Stack gap="3" data-testid="agent-graph">
      <HStack gap="2" wrap="wrap">
        {scopes.length > 1 && (
          <SelectField size="sm" width="auto" aria-label={t('graph.place')} value={scope} options={scopes.map((p) => ({ value: p, label: p }))}
            onChange={(e) => { setScope(e.target.value); setThing(null); }} data-testid="agent-graph-place" />
        )}
        <SearchInput size="sm" maxW="20rem" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t('graph.find')} aria-label={t('graph.find')} data-testid="agent-graph-find" />
      </HStack>
      {data && !data.on && <InlineAlert tone="warning">{t('graph.off', { why: data.why ?? '' })}</InlineAlert>}
      {data?.on && num(data.waiting) > 0 && <Text textStyle="caption" color="fg.muted">{t('graph.waiting', { count: num(data.waiting) })}</Text>}
      <InlineAlert tone="danger">{graph.error}</InlineAlert>
      {(!data || data.on) && (
        <Grid templateColumns={{ base: '1fr', lg: 'minmax(12rem, 16rem) minmax(0, 1fr)' }} gap="4" alignItems="start">
          <DataTable<AgentGraphThing>
            rows={data?.view.things}
            loading={!data && graph.loading}
            getRowId={(x) => x.id}
            size="sm"
            maxHeight="28rem"
            stickyHeader
            interactive
            aria-label={t('graph.things')}
            empty={words ? t('graph.noMatch') : t('graph.nothing')}
            selection={{ selectedId: thing, onSelect: (x) => setThing(x.id) }}
            columns={[
              { id: 'name', header: t('graph.things'), cell: (x) => <Text dir="auto" truncate title={x.name}>{x.name}</Text> },
              { id: 'facts', header: t('graph.facts'), numeric: true, cell: (x) => <Text textStyle="caption">{num(x.facts)}</Text> },
            ]}
          />
          {data?.view.thing ? <ThingDetail page={data} onPick={setThing} /> : <Text textStyle="body.sm" color="fg.muted" pt="2">{t('graph.pick')}</Text>}
        </Grid>
      )}
    </Stack>
  );
}
