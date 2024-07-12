<script>
    import cv from "@techstark/opencv-js";

    let imgElement;
    let canvas;

    let maskJSON;
    function getMaskData() {
        fetch("maskdata.json").then((response) => response.json()).then((data) => {
            maskJSON = data;
            // multiply by 255 to get uint8 data
            maskJSON.mask = maskJSON.mask.map((x) => x * 255);
            console.log(maskJSON);
        });
    }

    function maskCoordsToImg(x, y) {
        let result = [x / (256 * (imgElement.width / imgElement.height)) * imgElement.width, y / 256 * imgElement.height];
        console.log(result);
        return result;
    }

    function render() {
            // let mat = cv.imread(imgElement);
        let mat = cv.matFromArray(256, 256, cv.CV_8UC1, maskJSON.mask);
        console.log("mat loaded");
        // cv.cvtColor(mat, mat, cv.COLOR_BGR2GRAY);
        let thresh = cv.Mat.zeros(mat.rows, mat.cols, cv.CV_8UC1);
        cv.threshold(mat, thresh, 0, 255, cv.THRESH_BINARY);
        cv.erode(thresh, thresh, cv.Mat.ones(3, 3, cv.CV_8U), new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        cv.dilate(thresh, thresh, cv.Mat.ones(3, 3, cv.CV_8U), new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
        let poly = new cv.MatVector();
        for (let i = 0; i < contours.size(); i++) {
            let tmp = new cv.Mat();
            let contour = contours.get(i);
            let epsilon = 0.001 * cv.arcLength(contour, true);
            cv.approxPolyDP(contour, tmp, epsilon, true);
            poly.push_back(tmp);
            contour.delete();
            tmp.delete();
        }
        // cv.drawContours(mat, contours, -1, [128, 0, 0, 255], 2);
        cv.imshow(canvas, mat);
        let ctx = canvas.getContext("2d");
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height); //
        ctx.strokeStyle = "red";
        for (let i = 0; i < poly.size(); i++) {
            const mat = poly.get(i);
            const dataArray = mat.data32S;
            console.log(dataArray);
            ctx.beginPath();
            ctx.moveTo(...maskCoordsToImg(dataArray[0], dataArray[1]));
            for (let j = 2; j < dataArray.length; j += 2) {
                console.log(j);
                ctx.lineTo(...maskCoordsToImg(dataArray[j], dataArray[j + 1]));
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
</script>

<style>
    :global(body) {
        background-color: blue;
    }

    img {
        max-width: 100%;
        max-height: 90vh;
        opacity: 1;
    }

    #segmentation {
        position: relative;
        background-color: gray;
    }

    #segmentation canvas {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        overflow: visible;
    }

    .borderTest {
        position: relative;
        box-sizing: border-box;
        margin: auto;
        width: 400px;
        height: 200px;
        border-radius: 10px;
        overflow: hidden;

        &::before {
            box-sizing: border-box;
            content: "";
            position: absolute;
            z-index: -2;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-image: linear-gradient(0deg, white 40%, rgba(2,0,36,1) 40%, rgba(0,0,0,1) 60%, white 60%);
            background-repeat: no-repeat;
            border-radius: 10px;
            animation: rotate 4s linear infinite;
        }

        &::after {
            box-sizing: border-box;
            content: "";
            position: absolute;
            z-index: -1;
            left: 6px;
            top: 6px;
            width: calc(100% - 12px);
            height: calc(100% - 12px);
            background-color: white;
            border-radius: 10px;
        }
    }

    @keyframes -global-rotate {
        0% {
            transform: rotate(0deg) translate(50%);
        }
        100% {
            transform: rotate(1turn) translate(50%);
        }
    }
</style>

<div class="borderTest">
    <p>test</p>
</div>
<button on:click={getMaskData}>Get Mask Data</button>
<button on:click={render}>Render</button>
<div id="segmentation">
    <!-- <img src="hold_mask_3.png" bind:this={imgElement}/> -->
    <canvas bind:this={canvas}></canvas>
</div>
