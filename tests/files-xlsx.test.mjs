// Excel in the browser (src/files/xlsx.ts): the first visible sheet as text rows, shared and inline strings, numbers as
// Excel shows them, dates from cell styles, and the files it refuses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { columnOf, isDateFormat, numberText, readXlsx, serialDate, XlsxError } from '../src/files/xlsx.ts';

/** A zip of the given parts (deflated unless `stored`); the reader doesn't check CRCs, so they're left 0. */
function zip(parts, stored = false) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of Object.entries(parts)) {
    const nameBytes = Buffer.from(name);
    const raw = Buffer.from(text);
    const body = stored ? raw : deflateRawSync(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(stored ? 0 : 8, 8);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(raw.length, 22);
    head.writeUInt16LE(nameBytes.length, 26);
    local.push(head, nameBytes, body);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(stored ? 0 : 8, 10);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(nameBytes.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(parts).length, 8);
  end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(size, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, ...central, end]));
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function book({ sheets = '<sheet name="Requests" sheetId="1" r:id="rId1"/>', sheetData, strings = [], pr = '', stored = false, extra = {} }) {
  return zip({
    'xl/workbook.xml': `<?xml version="1.0"?><workbook ${NS}>${pr}<sheets>${sheets}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="worksheet" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
    'xl/sharedStrings.xml': `<sst ${NS}>${strings.map((s) => `<si>${s}</si>`).join('')}</sst>`,
    'xl/styles.xml': `<styleSheet ${NS}><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>`
      + '<numFmt numFmtId="165" formatCode="#,##0.00 &quot;SAR&quot;"/></numFmts>'
      + '<cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml': `<worksheet ${NS}><sheetData>${sheetData}</sheetData></worksheet>`,
    ...extra,
  }, stored);
}

test('shared strings, rich text and inline strings come out as text, in English or Arabic', async () => {
  const file = book({
    strings: ['<t>Title</t>', '<t>Owner</t>', '<r><t>Buy </t></r><r><rPr><b/></rPr><t xml:space="preserve">laptops &amp; screens</t></r>',
      '<t>مكتب الرياض</t><rPh sb="0" eb="1"><t>x</t></rPh>', '<t>line_x000D_two</t>'],
    sheetData: '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
      + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="inlineStr"><is><t>sara</t></is></c></row>'
      + '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3" t="s"><v>4</v></c></row>',
  });
  const { sheet, sheets, rows } = await readXlsx(file);
  assert.equal(sheet, 'Requests');
  assert.equal(sheets, 1);
  assert.deepEqual(rows, [['Title', 'Owner'], ['Buy laptops & screens', 'sara'], ['مكتب الرياض', 'line\rtwo']]);
});

test('numbers as Excel shows them, dates from their cell style, booleans, formulas’ last values', async () => {
  const { rows } = await readXlsx(book({
    sheetData: '<row r="1"><c r="A1" t="inlineStr"><is><t>n</t></is></c></row>'
      + '<row r="2"><c r="A2"><v>0.30000000000000004</v></c><c r="B2" s="1"><v>46361</v></c><c r="C2" s="2"><v>46361.5</v></c>'
      + '<c r="D2" s="3"><v>1250.5</v></c><c r="E2" t="b"><v>1</v></c><c r="F2" t="str"><f>A1&amp;"x"</f><v>nx</v></c>'
      + '<c r="G2" t="e"><v>#N/A</v></c><c r="H2"><v>12</v></c></row>',
  }));
  assert.deepEqual(rows[1], ['0.3', '2026-12-05', '2026-12-05T12:00', '1250.5', 'TRUE', 'nx', '#N/A', '12']);
});

test('cells keep their columns when some are empty, empty rows and style-only cells are left out', async () => {
  const { rows } = await readXlsx(book({
    sheetData: '<row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c><c r="C1" t="inlineStr"><is><t>c</t></is></c><c r="D1" s="1"/></row>'
      + '<row r="2"/><row r="3"><c r="B3" s="1"/></row><row r="4"><c><v>1</v></c><c><v>2</v></c></row>',
  }));
  assert.deepEqual(rows, [['a', '', 'c'], ['1', '2']]);
});

test('the first visible sheet is read, through a relationship with an absolute path; namespace prefixes are fine', async () => {
  const { sheet, sheets, rows } = await readXlsx(book({
    sheets: '<sheet name="Old" sheetId="1" state="hidden" r:id="rId1"/><sheet name="Now" sheetId="2" r:id="rId2"/><sheet name="Later" sheetId="3" r:id="rId1"/>',
    sheetData: '',
    extra: { 'xl/worksheets/sheet2.xml': `<x:worksheet xmlns:x="${NS}"><x:sheetData><x:row r="1"><x:c r="A1" t="inlineStr"><x:is><x:t>here</x:t></x:is></x:c></x:row></x:sheetData></x:worksheet>` },
  }));
  assert.equal(sheet, 'Now');
  assert.equal(sheets, 2);
  assert.deepEqual(rows, [['here']]);
});

test('stored (not deflated) parts and the 1904 date system', async () => {
  const { rows } = await readXlsx(book({ stored: true, pr: '<workbookPr date1904="1"/>', sheetData: '<row r="1"><c r="A1" s="1"><v>0</v></c></row>' }));
  assert.deepEqual(rows, [['1904-01-01']]);
});

test('an older .xls or a file with a password, and a file that isn’t a workbook, are refused by name', async () => {
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
  await assert.rejects(readXlsx(ole), (e) => e instanceof XlsxError && e.problem === 'old');
  await assert.rejects(readXlsx(new TextEncoder().encode('Title,Owner\r\n')), (e) => e instanceof XlsxError && e.problem === 'broken');
  await assert.rejects(readXlsx(zip({ 'word/document.xml': '<w/>' })), (e) => e instanceof XlsxError && e.problem === 'broken');
  await assert.rejects(readXlsx(book({ sheets: '', sheetData: '' })), (e) => e instanceof XlsxError && e.problem === 'noSheet');
});

test('date serials, columns, number formats and number text', () => {
  assert.equal(serialDate(1), '1900-01-01');
  assert.equal(serialDate(59), '1900-02-28');
  assert.equal(serialDate(61), '1900-03-01');
  assert.equal(serialDate(45658), '2025-01-01');
  assert.equal(serialDate(45658.75), '2025-01-01T18:00');
  assert.equal(serialDate(45658 + 1 / 86400 * 61), '2025-01-01T00:01:01');
  assert.equal(columnOf('A1'), 0);
  assert.equal(columnOf('AB7'), 27);
  assert.equal(isDateFormat('dd/mm/yyyy'), true);
  assert.equal(isDateFormat('[$-409]mmmm d, yyyy;@'), true);
  assert.equal(isDateFormat('h:mm AM/PM'), true);
  assert.equal(isDateFormat('#,##0.00 "SAR"'), false);
  assert.equal(isDateFormat('[Red]0.00'), false);
  assert.equal(isDateFormat('0.00E+00'), false);
  assert.equal(numberText('1E-3'), '0.001');
  assert.equal(numberText('123456789012345678'), '123456789012346000');
});
