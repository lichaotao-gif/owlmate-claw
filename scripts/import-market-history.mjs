import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const output = resolve('lib/market-history-data.json');
const sources = process.argv.slice(2);

if (!sources.length) {
  console.error('请传入通达信导出的 ETF 历史数据文件。');
  process.exit(1);
}

const decoder = new TextDecoder('gb18030');
const result = {};

for (const source of sources) {
  const text = decoder.decode(readFileSync(source));
  const heading = text.match(/^\s*(.+?)\s*\((\d{6})\)/m);
  if (!heading) throw new Error(`无法识别文件标题：${source}`);

  const [, name, code] = heading;
  const bars = [
    ...text.matchAll(
      /^\s*(\d{4})\/(\d{2})\/(\d{2})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)/gm,
    ),
  ].map((match) => ({
    date: `${match[1]}-${match[2]}-${match[3]}`,
    open: Number(match[4]),
    high: Number(match[5]),
    low: Number(match[6]),
    close: Number(match[7]),
    volume: Number(match[8]),
  }));

  if (!bars.length) throw new Error(`文件没有可用日线：${source}`);
  result[code] = {
    code,
    name: name.trim(),
    sourceFile: basename(source),
    bars: bars.slice(-250),
  };
}

writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`已生成 ${output}，包含 ${Object.keys(result).length} 只 ETF。`);
