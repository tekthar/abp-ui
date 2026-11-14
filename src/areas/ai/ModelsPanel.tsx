import { useState } from 'react';
import { HStack, Input, Stack, Text } from '@chakra-ui/react';
import { Button, CheckboxField, DataTable, Field, FormDialog, HostSlot, notify, Panel, SelectField, StatusPill, SwitchField, errorText, useApiAction, useAreaRequest, useFormatters, useOptionalHost } from '@abpjs/ui';
import { modelRows, withModel, type AiModelRow } from './models';
import { useAiTexts } from './texts';
import type { AiConnection } from './types';

/**
 * Models: each connection's, found by asking it, off until enabled, with what they can do and their prices per million
 * tokens. Where the host keeps the connections itself (`hostKeeps`), the screen doesn't change them: each row shows the
 * host's `ai.models.edit` and the panel its `ai.models.actions`; and what each model can do is the host's to say when
 * it fills `ai.models.can` (its own record of it, where the gateway is told every model takes everything).
 */
export function ModelsPanel({ scopeId, connections, rows, loading, hostKeeps, onChanged, title, description }: {
  scopeId?: string;
  /** The connections whose models are listed and may be changed here. */
  connections: AiConnection[] | undefined;
  /** Rows to list in place of the connections' (a scope's opened models and its own); its own are still changed through `connections`. */
  rows?: AiModelRow[];
  loading?: boolean;
  hostKeeps: boolean;
  onChanged: () => Promise<void> | void;
  title: string;
  description: string;
}) {
  const t = useAiTexts();
  const fmt = useFormatters();
  const request = useAreaRequest('ai');
  const [editing, setEditing] = useState<AiModelRow | null>(null);
  const [finding, setFinding] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const list = connections ?? [];
  const shown = rows ?? (connections ? modelRows(connections) : undefined);
  const source = list.find((c) => c.id === picked) ?? list[0];
  const own = (m: AiModelRow) => list.some((c) => c.id === m.connectionId);
  const host = useOptionalHost();
  const hostSaysCan = hostKeeps && Boolean(host?.slots?.['ai.models.can']);

  async function discover(c: AiConnection) {
    setFinding(c.id);
    try {
      const found = await request<AiConnection>(`/connections/${encodeURIComponent(c.id)}/discover`, { method: 'POST' });
      notify.success(t('found', { count: found.models.length, name: c.name }));
      await onChanged();
    } catch (e) {
      notify.error(errorText(e));
    } finally {
      setFinding(null);
    }
  }

  const price = (m: AiModelRow) =>
    m.inputPrice == null && m.outputPrice == null
      ? t('noPrice')
      : t('price', { input: fmt.number(m.inputPrice ?? 0, { maximumFractionDigits: 4 }), output: fmt.number(m.outputPrice ?? 0, { maximumFractionDigits: 4 }) });

  return (
    <Panel title={title} description={description} flush data-testid="ai-models"
      actions={hostKeeps
        ? <HostSlot name="ai.models.actions" context={{ scopeId, onChanged }} />
        : list.length > 0 && (
          <HStack gap="2">
            <SelectField size="sm" width="auto" value={source?.id ?? ''} aria-label={t('connection')}
              options={list.map((c) => ({ value: c.id, label: c.name }))} onChange={(e) => setPicked(e.target.value)} />
            <Button size="sm" variant="secondary" loading={finding !== null} disabled={!source} onClick={() => source && void discover(source)}>{t('findModels')}</Button>
          </HStack>
        )}>
      <DataTable
        aria-label={title}
        rows={shown}
        loading={loading}
        getRowId={(m) => m.key}
        empty={list.length ? t('noModelsFind') : t('noModels')}
        columns={[
          {
            id: 'model',
            header: t('model'),
            cell: (m) => (
              <Stack gap="0.5">
                <Text fontWeight="medium">{m.name}</Text>
                <Text textStyle="caption" color="fg.muted"><Text as="span" fontFamily="mono" dir="ltr">{m.modelId}</Text> · {m.connection}</Text>
              </Stack>
            ),
          },
          {
            id: 'can',
            header: t('can'),
            cell: (m) => hostSaysCan ? <HostSlot name="ai.models.can" context={{ connectionId: m.connectionId, modelId: m.modelId }} /> : (
              <HStack gap="1" flexWrap="wrap">
                {m.tools && <StatusPill tone="neutral" dot={false}>{t('tools')}</StatusPill>}
                {m.images && <StatusPill tone="neutral" dot={false}>{t('images')}</StatusPill>}
                {m.structuredOutput && <StatusPill tone="neutral" dot={false}>{t('structured')}</StatusPill>}
              </HStack>
            ),
          },
          {
            id: 'price',
            header: t('prices'),
            cell: (m) => (
              <Stack gap="0.5">
                <Text textStyle="sm">{price(m)}</Text>
                {m.priceSetAt && <Text textStyle="caption" color="fg.muted">{t('priceSetAt', { at: fmt.dateTime(m.priceSetAt, { dateStyle: 'medium' }) })}</Text>}
              </Stack>
            ),
          },
          { id: 'on', header: t('state'), nowrap: true, cell: (m) => <StatusPill tone={m.enabled ? 'success' : 'neutral'}>{m.enabled ? t('on') : t('off')}</StatusPill> },
          {
            id: 'edit',
            header: <Text srOnly>{t('edit')}</Text>,
            align: 'end',
            cell: (m) =>
              !own(m) ? null
                : hostKeeps
                  ? <HostSlot name="ai.models.edit" context={{ connectionId: m.connectionId, modelId: m.modelId, scopeId, onSaved: onChanged }} />
                  : <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>{t('edit')}</Button>,
          },
        ]}
      />
      {editing && (
        <ModelEditor connection={list.find((c) => c.id === editing.connectionId)!} model={editing} onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged(); }} />
      )}
    </Panel>
  );
}

function ModelEditor({ connection, model, onClose, onSaved }: { connection: AiConnection; model: AiModelRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const t = useAiTexts();
  const request = useAreaRequest('ai');
  const action = useApiAction();
  const [name, setName] = useState(model.name === model.modelId ? '' : model.name);
  const [enabled, setEnabled] = useState(model.enabled);
  const [tools, setTools] = useState(model.tools);
  const [images, setImages] = useState(model.images);
  const [structured, setStructured] = useState(model.structuredOutput);
  const [context, setContext] = useState(model.contextTokens == null ? '' : String(model.contextTokens));
  const [input, setInput] = useState(model.inputPrice == null ? '' : String(model.inputPrice));
  const [output, setOutput] = useState(model.outputPrice == null ? '' : String(model.outputPrice));
  const number = (v: string) => (v.trim() === '' ? null : Number(v));

  async function save() {
    const settings = {
      ...connection.modelSettings?.[model.modelId],
      name: name.trim() || null,
      enabled,
      tools,
      images,
      structuredOutput: structured,
      contextTokens: number(context),
    };
    const price = input.trim() === '' && output.trim() === '' ? null : { input: number(input) ?? 0, output: number(output) ?? 0 };
    const body = withModel(connection, model.modelId, settings, price);
    if (await action.run(() => request(`/connections/${encodeURIComponent(connection.id)}`, { method: 'PUT', body })) !== undefined) await onSaved();
  }

  return (
    <FormDialog open onOpenChange={(open) => !open && onClose()} title={t('editModel', { name: model.modelId })} submitLabel={t('save')} onSubmit={save}
      busy={action.busy} error={action.error}>
      <SwitchField label={t('modelOn')} checked={enabled} onCheckedChange={setEnabled} />
      <Field label={t('name')} helperText={t('nameHint')}>
        <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Stack gap="1.5" role="group" aria-labelledby="ai-model-can">
        <Text id="ai-model-can" textStyle="sm" fontWeight="medium">{t('can')}</Text>
        <CheckboxField label={t('toolsLong')} checked={tools} onCheckedChange={setTools} />
        <CheckboxField label={t('imagesLong')} checked={images} onCheckedChange={setImages} />
        <CheckboxField label={t('structuredLong')} checked={structured} onCheckedChange={setStructured} />
      </Stack>
      <Field label={t('context')} optionalText={t('optional')}>
        <Input type="number" min={1} value={context} dir="ltr" onChange={(e) => setContext(e.target.value)} />
      </Field>
      <HStack gap="3" alignItems="start">
        <Field label={t('inputPrice')} helperText={t('perMillion')}>
          <Input type="number" min={0} step="any" value={input} dir="ltr" onChange={(e) => setInput(e.target.value)} />
        </Field>
        <Field label={t('outputPrice')} helperText={t('perMillion')}>
          <Input type="number" min={0} step="any" value={output} dir="ltr" onChange={(e) => setOutput(e.target.value)} />
        </Field>
      </HStack>
    </FormDialog>
  );
}
