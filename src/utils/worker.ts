import { CutMode } from '../common/enums';

export default (function () {
    // 以像素裁剪和以数量裁剪的代码
    const pixelAndAmountCutCode = () => {
        onmessage = (e: MessageEvent) => {
            if (!e.data) return;
            const { pixelWidth, pixelHeight, imgSource, amountRow, amountCol } = e.data;
            for (let i = 0; i < amountCol; i++) {
                for (let j = 0; j < amountRow; j++) {
                    const offscreenCanvas = new OffscreenCanvas(pixelWidth, pixelHeight);
                    const ctx = offscreenCanvas.getContext(
                        '2d'
                    ) as OffscreenCanvasRenderingContext2D;
                    ctx.drawImage(
                        imgSource,
                        pixelWidth * j,
                        pixelHeight * i,
                        pixelWidth,
                        pixelHeight,
                        0,
                        0,
                        pixelWidth,
                        pixelHeight
                    );
                    const imageBitmap = offscreenCanvas.transferToImageBitmap();
                    postMessage(imageBitmap);
                }
            }
        };
    };

    // 智能识别分隔线裁剪的代码
    const smartCutCode = () => {
        onmessage = function (e) {
            if (!e.data) return;
            var imgSource = e.data.imgSource;
            var imgWidth = e.data.imgWidth;
            var imgHeight = e.data.imgHeight;
            var sensitivity = e.data.sensitivity;
            var minGapHeight = e.data.minGapHeight;

            // 下采样以加速扫描（缩放到约400px宽）
            var SCAN_MAX_WIDTH = 400;
            var scaleDown = Math.max(1, Math.floor(imgWidth / SCAN_MAX_WIDTH));
            var scanWidth = Math.floor(imgWidth / scaleDown);
            var scanHeight = Math.floor(imgHeight / scaleDown);
            var scaledMinGap = Math.max(2, Math.floor(minGapHeight / scaleDown));

            // 绘制缩略图
            var scanCanvas = new OffscreenCanvas(scanWidth, scanHeight);
            var scanCtx = scanCanvas.getContext('2d');
            scanCtx.drawImage(imgSource, 0, 0, scanWidth, scanHeight);
            var imageData = scanCtx.getImageData(0, 0, scanWidth, scanHeight);

            // sensitivity(0-100) → 亮度阈值
            // 0=极严格(只认纯白, threshold=240), 100=极宽松(threshold=160)
            var brightnessThreshold = 240 - (sensitivity / 100) * 80;
            var varianceThreshold = 120;

            var COLUMNS = 8;
            var colWidth = Math.max(1, Math.floor(scanWidth / COLUMNS));

            // 逐行分析：每行分成8列，每列必须足够亮+均匀才是"分隔行"
            var gapRows = [];
            for (var y = 0; y < scanHeight; y++) {
                var allColsUniform = true;
                for (var c = 0; c < COLUMNS; c++) {
                    var startX = c * colWidth;
                    var endX = Math.min((c + 1) * colWidth, scanWidth);
                    var sumB = 0;
                    var sumSqB = 0;
                    var count = 0;
                    for (var x = startX; x < endX; x++) {
                        var idx = (y * scanWidth + x) * 4;
                        var brightness =
                            (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
                        sumB += brightness;
                        sumSqB += brightness * brightness;
                        count++;
                    }
                    var avg = sumB / count;
                    var variance = sumSqB / count - avg * avg;
                    if (avg < brightnessThreshold || variance > varianceThreshold) {
                        allColsUniform = false;
                        break;
                    }
                }
                gapRows.push(allColsUniform);
            }

            // 将连续分隔行分组为"分隔带"
            var gapBands = [];
            var bandStart = -1;
            for (var i = 0; i < gapRows.length; i++) {
                if (gapRows[i]) {
                    if (bandStart === -1) bandStart = i;
                } else {
                    if (bandStart !== -1 && i - bandStart >= scaledMinGap) {
                        gapBands.push({ start: bandStart, end: i });
                    }
                    bandStart = -1;
                }
            }
            if (bandStart !== -1 && gapRows.length - bandStart >= scaledMinGap) {
                gapBands.push({ start: bandStart, end: gapRows.length });
            }

            // 忽略顶部和底部边缘的留白
            var edgeMargin = Math.floor(20 / scaleDown);
            var validBands = gapBands.filter(function (b) {
                return b.start > edgeMargin && b.end < scanHeight - edgeMargin;
            });

            // 计算切点
            var cutPoints;
            if (validBands.length === 0) {
                // 未检测到分隔线 → 回退为每600px切一刀
                var fallbackHeight = 600;
                cutPoints = [0];
                var py = fallbackHeight;
                while (py < imgHeight) {
                    cutPoints.push(py);
                    py += fallbackHeight;
                }
                cutPoints.push(imgHeight);
            } else {
                cutPoints = [0];
                for (var i = 0; i < validBands.length; i++) {
                    var bandCenter = Math.round(
                        ((validBands[i].start + validBands[i].end) / 2) * scaleDown
                    );
                    cutPoints.push(bandCenter);
                }
                cutPoints.push(imgHeight);
            }

            // 按切点裁剪并回传
            for (var i = 0; i < cutPoints.length - 1; i++) {
                var segY = cutPoints[i];
                var segHeight = cutPoints[i + 1] - segY;
                if (segHeight <= 0) continue;

                var segCanvas = new OffscreenCanvas(imgWidth, segHeight);
                var segCtx = segCanvas.getContext('2d');
                segCtx.drawImage(imgSource, 0, segY, imgWidth, segHeight, 0, 0, imgWidth, segHeight);
                var bitmap = segCanvas.transferToImageBitmap();
                postMessage(bitmap);
            }
        };
    };

    // 以比例裁剪的代码
    const scaleCutCode = () => {
        onmessage = (e: MessageEvent) => {
            if (!e.data) return;
            const { imgSource, scaleWidth, scaleHeight } = e.data;
            let amount = 0;
            let cutLength = 0;
            const dir = imgSource.height > imgSource.width ? 'VERTICAL' : 'HORIZONTAL';
            const scale = scaleWidth / scaleHeight;
            if (dir === 'VERTICAL') {
                amount = Math.ceil(scale * (imgSource.height / imgSource.width));
                cutLength = (1 / scale) * imgSource.width;
            } else {
                amount = Math.ceil((1 / scale) * (imgSource.width / imgSource.height));
                cutLength = scale * imgSource.height;
            }
            for (let i = 0; i < amount; i++) {
                const offscreenCanvas = new OffscreenCanvas(0, 0);
                if (dir === 'VERTICAL') {
                    let drawLength;
                    if (i === amount - 1) {
                        drawLength = imgSource.height % cutLength;
                    } else {
                        drawLength = cutLength;
                    }
                    [offscreenCanvas.width, offscreenCanvas.height] = [imgSource.width, drawLength];
                    const ctx = offscreenCanvas.getContext(
                        '2d'
                    ) as OffscreenCanvasRenderingContext2D;
                    ctx?.drawImage(
                        imgSource,
                        0,
                        cutLength * i,
                        imgSource.width,
                        drawLength,
                        0,
                        0,
                        imgSource.width,
                        drawLength
                    );
                } else {
                    let drawLength;
                    if (i === amount - 1) {
                        drawLength = imgSource.width % cutLength;
                    } else {
                        drawLength = cutLength;
                    }
                    [offscreenCanvas.width, offscreenCanvas.height] = [
                        drawLength,
                        imgSource.height
                    ];
                    const ctx = offscreenCanvas.getContext(
                        '2d'
                    ) as OffscreenCanvasRenderingContext2D;
                    ctx?.drawImage(
                        imgSource,
                        cutLength * i,
                        0,
                        drawLength,
                        imgSource.height,
                        0,
                        0,
                        drawLength,
                        imgSource.height
                    );
                }
                const imageBitmap = offscreenCanvas.transferToImageBitmap();
                postMessage(imageBitmap);
            }
        };
    };

    // 将代码转为字符串
    const convert = (workerCode: Function) => {
        let code = workerCode.toString();
        code = code.substring(code.indexOf('{') + 1, code.lastIndexOf('}'));
        const blob = new Blob([code], { type: 'text/javascript' });
        return URL.createObjectURL(blob);
    };

    // 裁剪类 worker
    class CutWorker {
        worker: Worker;
        constructor(cutMode: CutMode) {
            this.worker = new Worker(this.getCodeStr(cutMode));
        }
        public reset(cutMode: CutMode) {
            this.worker.terminate();
            this.worker = new Worker(this.getCodeStr(cutMode));
        }
        getCodeStr(cutMode: CutMode) {
            let str = '';
            switch (cutMode) {
                case CutMode.PIXEL:
                case CutMode.AMOUNT:
                    str = convert(pixelAndAmountCutCode);
                    break;
                case CutMode.SCALE:
                    str = convert(scaleCutCode);
                    break;
                case CutMode.SMART:
                    str = convert(smartCutCode);
                    break;
                default:
                    throw new Error('cutMode error');
            }
            return str;
        }
    }

    return new CutWorker(CutMode.AMOUNT);
})();
