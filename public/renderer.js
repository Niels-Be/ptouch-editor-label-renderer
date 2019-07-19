const TARGET_DPI = 300;
const SCALE = TARGET_DPI / 96; // 96 is fixed canvas DPI
const PX_TO_MM = 0.26465566306203764; // @ 96 DPI

class PTouchRenderer {

    static RenderMap = {
        "text:text": PTouchRenderer.prototype.drawText,
        "table:table": PTouchRenderer.prototype.drawTable,
        "image:image": PTouchRenderer.prototype.drawImage,
        "barcode:barcode": PTouchRenderer.prototype.drawBarcode,
        "pt:group": PTouchRenderer.prototype.drawObjects,
        "pt:brush": null,
        "draw:rect": PTouchRenderer.prototype.drawRect,
        "draw:poly": PTouchRenderer.prototype.drawPoly,
    }

    /**
     * 
     * @param {HTMLCanvasElement|string} canvas canvas element or id of an canvas element
     */
    constructor(canvas) {
        if(typeof canvas === "string") {
            canvas = document.getElementById(canvas);
        }
        if(!canvas) {
            throw new Error("Canvas not found");
        }

        /**
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;
        /**
         * @type {CanvasRenderingContext2D}
         */
        this.ctx = canvas.getContext("2d");
    }

    /**
     * Opens a ptouch editor lbx file
     * @param {JSZip|File} lbxFile 
     */
    async open(lbxFile) {
        if (!(JSZip instanceof JSZip))
            lbxFile = await JSZip.loadAsync(lbxFile);
        this.lbxFile = lbxFile;
        const labelXML = await lbxFile.file("label.xml").async("string");
        const parser = new DOMParser();
        this.lableDoc = parser.parseFromString(labelXML, "text/xml");

        this.fieldOverwrites = {};
        this.updateFields();
    }

    /**
     * Render the lable into the canvas
     */
    render() {
        const paper = this.getPaper();

        canvas.width = paper.width * SCALE;
        canvas.height = paper.height * SCALE;

        this.ctx.resetTransform();
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.ctx.scale(SCALE, SCALE);
        // drawing does not perfectly fit, probably because of rounding errors
        // so down scale the image a little bit
        this.ctx.scale(0.995, 0.992);
        this.ctx.translate(-paper.marginLeft * 0.9, -paper.marginTop * 0.95);

        return this.drawObjects(this.lableDoc);
    }

    /**
     * Get fields parsed from lable
     */
    getFields() {
        return this.fieldOverwrites;
    }

    /**
     * Overwrite field values in the lable
     * You need to call render() afterwards to make changes visible
     * @param {object} fieldOverwrites 
     */
    setFieldOverwrites(fieldOverwrites) {
        this.fieldOverwrites = Object.assign({}, fieldOverwrites);
        this.updateFields();
    }

    /**
     * Get paper settings
     */
    getPaper() {
        if (!this.lableDoc) throw new Error("No open document, call open(file) first");
        const paperObj = this.lableDoc.getElementsByTagName("style:paper")[0];
        const backGroundObj = this.lableDoc.getElementsByTagName("style:backGround")[0];
        return {
            width: sizeToPx(backGroundObj.getAttribute("width")),
            height: sizeToPx(backGroundObj.getAttribute("height")),
            totalWidth: sizeToPx(paperObj.getAttribute("width")), // includes margins
            totalHeight: sizeToPx(paperObj.getAttribute("height")), // includes margins
            marginLeft: sizeToPx(paperObj.getAttribute("marginLeft")),
            marginTop: sizeToPx(paperObj.getAttribute("marginTop")),
            marginRight: sizeToPx(paperObj.getAttribute("marginRight")),
            marginBottom: sizeToPx(paperObj.getAttribute("marginBottom")),
            orientation: paperObj.getAttribute("orientation"),
            autoLength: paperObj.getAttribute("autoLength") === "true",
            printColorDisplay: paperObj.getAttribute("printColorDisplay") === "true",
        };
    }

    /**
     * Get paper type matching brother_ql names
     */
    getPaperName() {
        const paper = this.getPaper();
        const pW = Math.round(paper.totalWidth * PX_TO_MM);
        const pH = Math.round(paper.totalHeight * PX_TO_MM);
        if (paper.orientation === "portrait")
            return paper.autoLength ? pW.toString() : pW + "x" + pH;
        else
            return paper.autoLength ? pH.toString() : pH + "x" + pW;

    }



    /* ##### private methods ###### */

    /**
     * 
     * @private
     */
    updateFields() {
        let dataFieldCounter = 0;
        const dataElems = this.lableDoc.getElementsByTagName("pt:data");
        for (const dataObj of dataElems) {
            const styleObj = dataObj.parentElement.firstElementChild;
            while (styleObj) {
                if (styleObj.tagName === "pt:objectStyle") break;
            }
            if (!styleObj) throw new Error("Data Element without objectStyle");
            dataFieldCounter++;
            const expandedObj = styleObj.getElementsByTagName("pt:expanded")[0];
            const name = (expandedObj ?
                expandedObj.getAttribute("dbMergeFieldStyleName") || expandedObj.getAttribute("objectName") : null) ||
                ("Field" + dataFieldCounter);

            if (this.fieldOverwrites[name] !== undefined)
                dataObj.textContent = this.fieldOverwrites[name];
            else
                this.fieldOverwrites[name] = dataObj.textContent;
        }
    }


    /**
     * 
     * @private
     * @param {Element} obj 
     */
    async drawObjects(obj) {
        const objects = obj.getElementsByTagName("pt:objects");
        if (objects.length === 0) throw new Error("no objects found");

        for (const obj of objects[0].children) {
            await this.drawObject(obj);
        }
    }

    /**
     * 
     * @private
     * @param {Element} obj 
     */
    drawObject(obj) {
        const renderFn = PTouchRenderer.RenderMap[obj.tagName];
        if (renderFn) {
            return renderFn.call(this, obj);
        } else if (renderFn === undefined) {
            console.log("Unknown element", obj.tagName);
            const style = obj.querySelector(obj.tagName.split(":")[1] + " > objectStyle");
            if (style) {
                this.ctx.fillStyle = "red";
                this.ctx.strokeStyle = "red";
                this.ctx.setLineDash([3, 2]);
                this.ctx.strokeRect(
                    sizeToPx(style.getAttribute("x")),
                    sizeToPx(style.getAttribute("y")),
                    sizeToPx(style.getAttribute("width")),
                    sizeToPx(style.getAttribute("height"))
                );
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = "black";
                this.ctx.strokeStyle = "black";
            }
        }
    }

    /**
     * 
     * @private
     * @param {Element} obj 
     */
    drawText(obj) {
        const style = getObjectStyle(obj);
        const data = getObjectData(obj);
        const font = getFontInfo(obj);
        const textAlignObj = obj.getElementsByTagName("text:textAlign")[0];
        const textAlign = {
            horizontal: textAlignObj.getAttribute("horizontalAlignment"),
            vertical: textAlignObj.getAttribute("verticalAlignment"),
            baseline: textAlignObj.getAttribute("inLineAlignment"),
        }

        const fontSize = fitTextOnCanvas(this.ctx, data, font, style.width, Math.min(style.height, sizeToPx(font.orgSize)));
        this.ctx.font = `${font.italic === "true" ? "italic" : ""} ${font.weight} ${fontSize}px ${font.font}`;
        this.ctx.fillStyle = font.color;

        let xOffset, yOffset;
        switch (textAlign.horizontal) {
            case "LEFT":
                this.ctx.textAlign = "left";
                xOffset = 0;
                break;
            default:
            case "CENTER":
                this.ctx.textAlign = "center";
                xOffset = style.width / 2;
                break;
            case "RIGHT":
                this.ctx.textAlign = "right";
                xOffset = style.width;
                break;

        }
        switch (textAlign.vertical) {
            case "TOP":
                this.ctx.textBaseline = "top";
                yOffset = 0;
                break;
            default:
            case "CENTER":
                this.ctx.textBaseline = "middle";
                yOffset = style.height / 2;
                break;
            case "BOTTOM":
                this.ctx.textBaseline = "bottom";
                yOffset = style.height;
                break;
        }
        this.ctx.fillText(
            data,
            style.x + xOffset,
            style.y + yOffset,
            style.width
        );
    }

    /**
     * 
     * @private
     * @param {Element} obj 
     */
    async drawTable(obj) {
        const cells = obj.getElementsByTagName("table:cell");
        for (const cell of cells) {
            for (const elem of cell.children) {
                await this.drawObject(elem);
            }
        }
    }

    /**
     * 
     * @private
     * @param {Element} obj 
     */
    async drawImage(obj) {
        const style = getObjectStyle(obj);
        const imgStyle = obj.getElementsByTagName("image:imageStyle")[0];
        const transparentObj = obj.getElementsByTagName("image:transparent")[0];
        const monoObj = obj.getElementsByTagName("image:mono")[0];

        //TODO: support non binary images
        const threshold = monoObj && monoObj.hasAttribute("threshold") ? parseInt(monoObj.getAttribute("threshold")) : 128;
        const transparent = transparentObj && transparentObj.getAttribute("flag") === "true";

        const blob = await this.lbxFile.file(imgStyle.getAttribute("fileName")).async("blob");

        const image = await createImageBitmap(blob);

        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = image.width;
        tmpCanvas.height = image.height;
        const tmpCtx = tmpCanvas.getContext("2d");
        tmpCtx.drawImage(image, 0, 0);
        const imgDataCtx = tmpCtx.getImageData(0, 0, image.width, image.height);
        const imgData = imgDataCtx.data;
        // make the image binary and apply transparency
        for (let i = 0; i <= imgData.length; i += 4) {
            if (
                imgData[i + 0] < threshold ||
                imgData[i + 1] < threshold ||
                imgData[i + 2] < threshold
            ) {
                imgData[i + 0] = imgData[i + 1] = imgData[i + 2] = 0;
                imgData[i + 3] = 255;
            } else {
                imgData[i + 0] = imgData[i + 1] = imgData[i + 2] = 255;
                imgData[i + 3] = transparent ? 0 : 255;
            }
        }
        tmpCtx.putImageData(imgDataCtx, 0, 0);

        this.ctx.drawImage(tmpCanvas, style.x, style.y, style.width, style.height);
    }

    /**
     * 
     * @private
     * @param {Element} obj 
     */
    drawBarcode(obj) {
        const style = getObjectStyle(obj);
        let data = getObjectData(obj);
        const barcodeStyle = obj.getElementsByTagName("barcode:barcodeStyle")[0];

        const barcodeFormat = barcodeStyle.getAttribute("protocol");

        //TODO: support barcode styling like flat or noText
        //TODO: support other barcode formats
        if(barcodeFormat === "EAN13") {
            data = data.padStart(12, "0");
            data = data + EANChecksum(data);
        }
        if(barcodeFormat === "EAN8") {
            data = data.padStart(7, "0");
            data = data + EANChecksum(data);
        }

        const tmpCanvas = document.createElement("canvas");
        JsBarcode(tmpCanvas, data, {
            format: barcodeFormat,
            width: sizeToPx(barcodeStyle.getAttribute("barWidth")) * SCALE,
            height: style.height * SCALE - 11.0 * SCALE, // account for text size
            margin: 0,
            marginBottom: 2,
            fontSize: 10 * SCALE, //TODO: is the fontsize configurable?
        });
        if (tmpCanvas.height - style.height * SCALE > 1) {
            console.log("warning: Barcode to large:", tmpCanvas.height / SCALE - style.height);
        }
        this.ctx.save();
        //this.ctx.resetTransform();
        const mx = this.ctx.getTransform();
        mx.a = mx.d = 1;
        this.ctx.setTransform(mx);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(tmpCanvas,
            style.x * SCALE - SCALE,
            style.y * SCALE,
            //style.width,
            //style.height
        );
        this.ctx.restore();

        //document.body.append(tmpCanvas);
        //drawRect(obj, doc);
    }


    /**
     * 
     * @private
     * @param {Element} obj 
     */
    drawRect(obj) {
        const style = getObjectStyle(obj);
        const rectStyle = obj.getElementsByTagName("draw:rectStyle")[0];
        //TODO: are there more shapes then RECT and ROUNDEDRECT ?
        const shape = rectStyle ? rectStyle.getAttribute("shape") : "";
        const roundnessX = rectStyle ? sizeToPx(rectStyle.getAttribute("roundnessX") || "0") : 0;
        const roundnessY = rectStyle ? sizeToPx(rectStyle.getAttribute("roundnessY") || "0") : 0;

        //this.ctx.strokeStyle = style.backgroundColor;
        this.ctx.lineWidth = sizeToPx("1pt");

        //TODO: support non symmetrical corner rounding
        roundRect(this.ctx, style.x, style.y, style.width, style.height, roundnessX / 2, false, true);
    }

    /**
     * 
     * @private
     * @param {Element} obj 
     */
    drawPoly(obj) {
        const style = getObjectStyle(obj);
        //TODO: are there other shapes then LINE?
        const linePoints = obj.getElementsByTagName("draw:polyLinePoints")[0];
        const points = linePoints.getAttribute("points").split(" ");

        this.ctx.beginPath();
        for (const i in points) {
            const s = points[i].split(",");
            const x = sizeToPx(s[0]), y = sizeToPx(s[1]);
            if (i === 0)
                this.ctx.moveTo(x, y);
            else
                this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

};
//export { PTouchRenderer };
//export default PTouchRenderer;





/* ###### HELPER ####### */

/**
 * 
 * @private
 * @param {Element} obj 
 */
function getObjectData(obj) {
    const data = obj.getElementsByTagName("pt:data")[0];
    return data.textContent;
}


/**
 * 
 * @private
 * @param {Element} obj 
 */
function getObjectStyle(obj) {
    const style = obj.getElementsByTagName("pt:objectStyle")[0];
    return {
        x: sizeToPx(style.getAttribute("x")),
        y: sizeToPx(style.getAttribute("y")),
        width: sizeToPx(style.getAttribute("width")),
        height: sizeToPx(style.getAttribute("height")),
        backgroundColor: style.getAttribute("backColor")
    }
}

/**
 * 
 * @private
 * @param {Element} obj 
 */
function getFontInfo(obj) {
    const fontInfo = obj.getElementsByTagName("text:ptFontInfo")[0];
    const logFont = fontInfo.getElementsByTagName("text:logFont")[0];
    const fontExt = fontInfo.getElementsByTagName("text:fontExt")[0];
    return {
        font: logFont.getAttribute("name"),
        weight: logFont.getAttribute("weight"),
        italic: logFont.getAttribute("italic"),
        size: fontExt.getAttribute("size"),
        orgSize: fontExt.getAttribute("orgSize"),
        color: fontExt.getAttribute("textColor"),
    }
}

/**
 * 
 * @private
 * @param {string} str 
 */
function sizeToPx(str, dpi) {
    if (!dpi) dpi = 96;
    const val = parseFloat(str);
    if (str.endsWith("pt")) {
        return val * dpi / 72;
    }
    return val;
}


/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @private
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke == 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (const side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }

}


/**
 * 
 * @private
 * @param {string} num 
 */
function EANChecksum(num) {
    const res = num
        .split('')
        .map((n) => +n)
        .reduce((sum, a, idx) => (
            idx % 2 ? sum + a * 3 : sum + a
        ), 0);

    return (10 - (res % 10)) % 10;
};


/**
 * 
 * @private
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {string} fontfamily 
 * @param {number} desiredWidth 
 * @param {number} desiredHeight 
 * @param {number} [maxSize=300] 
 * @returns {number} fontsize in px
 */
function fitTextOnCanvas(ctx, text, font, desiredWidth, maxSize) {
    let min = 1;
    let max = maxSize || 300;
    while (max - min > 1) {
        const testSize = min + ((max - min) / 2); //Find half interval
        ctx.font = `${font.italic === "true" ? "italic" : ""} ${font.weight} ${testSize}px ${font.font}`;
        const measureTest = ctx.measureText(text).width;
        if (measureTest > desiredWidth) {
            max = testSize;
        } else {
            min = testSize;
        }
    }
    return min;
}