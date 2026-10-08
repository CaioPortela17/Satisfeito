import "server-only";
import QRCode from "qrcode";

// QR code em SVG (fica nítido em qualquer tamanho de impressão), ameixa sobre branco
export function gerarQrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#2a1f2dff", light: "#ffffffff" },
  });
}
