import * as XLSX from "xlsx";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";

// 统一的工作簿读取入口。
// 问题：部分 ODS 含 office:value-type="error" 的单元格（公式错误如 #N/A），
// SheetJS 的 ODS 解析器会直接抛 "Unsupported value type error"。
// 这里在解析前把 error 类型单元格降级为 string，使任何含公式错误的上传文件都能读。
export function readWorkbook(buf: Buffer): XLSX.WorkBook {
  let input: Buffer | Uint8Array = buf;
  const isZip = buf.length > 2 && buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
  if (isZip) {
    try {
      const files = unzipSync(new Uint8Array(buf));
      const xmlBytes = files["content.xml"]; // 仅 ODS 有此项；xlsx 没有，直接跳过
      if (xmlBytes) {
        let xml = strFromU8(xmlBytes);
        if (xml.includes('value-type="error"')) {
          xml = xml
            .replace(/office:value-type="error"/g, 'office:value-type="string"')
            .replace(/calcext:value-type="error"/g, 'calcext:value-type="string"');
          files["content.xml"] = strToU8(xml);
          input = Buffer.from(zipSync(files));
        }
      }
    } catch {
      // 解压失败则回退到原始 buffer，交给 SheetJS 处理
      input = buf;
    }
  }
  return XLSX.read(input, { type: "buffer", cellDates: true });
}
