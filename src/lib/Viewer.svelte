<script lang="ts">
    import createPanZoom from 'panzoom';
    import type { PanZoom } from 'panzoom';
    import type { Hold } from '$lib/pocketbase.svelte';
    import RecenterIcon from './icons/RecenterIcon.svelte';

    type Props = {
        imageUrl?: string;
        holds?: Hold[];
        editor?: boolean;
        onHoldClick?: (holdId: number) => void;
        onHoldResize?: (holdId: number) => void;
    };
    let {
        imageUrl,
        holds,
        editor = false,
        onHoldClick = () => {},
        onHoldResize = () => {}
    }: Props = $props();

    // Canvas size is fixed for performance
    const CANVAS_SIZE = 2048;
    const HOLD_CONTOUR_WIDTH = 15;
    const OUTLINE_WIDTH = 16;
    interface HoldStyleFunctions {
        [key: string]: (ctx: CanvasRenderingContext2D) => void;
    }
    const HOLD_STYLE_FUNCTIONS: HoldStyleFunctions = {
        default: (ctx: CanvasRenderingContext2D) => {
            ctx.setLineDash([]);
            ctx.strokeStyle = 'blue';
            ctx.shadowBlur = scale * HOLD_CONTOUR_WIDTH;
            ctx.shadowColor = ctx.strokeStyle;
        },
        start: (ctx: CanvasRenderingContext2D) => {
            ctx.setLineDash([]);
            ctx.strokeStyle = 'green';
            ctx.shadowBlur = scale * HOLD_CONTOUR_WIDTH;
            ctx.shadowColor = ctx.strokeStyle;
        },
        finish: (ctx: CanvasRenderingContext2D) => {
            ctx.setLineDash([20, 10]);
            ctx.strokeStyle = 'red';
            ctx.shadowBlur = scale * HOLD_CONTOUR_WIDTH;
            ctx.shadowColor = ctx.strokeStyle;
        }
    };
    const DIRS: Record<string, [number, number, number, number]> = {
        left: [1, 0.5, 0, 0.5],
        top: [0.5, 1, 0.5, 0],
        right: [0, 0.5, 1, 0.5],
        bottom: [0.5, 0, 0.5, 1]
    };

    let container: HTMLElement;
    let viewer: HTMLElement;
    let setImg: HTMLImageElement | undefined = $state();
    let canvas: HTMLCanvasElement | undefined = $state();
    let scale = $state(1);
    let panzoom: PanZoom;
    let selectedHold: Hold | undefined = $state();

    $effect(() => {
        panzoom = createPanZoom(viewer, {
            maxZoom: 10,
            minZoom: 0.1
        });
        recenter(panzoom);
    });
    $effect(() => {
        if (setImg && canvas && holds instanceof Array) {
            scale = Math.min(CANVAS_SIZE / setImg.naturalWidth, CANVAS_SIZE / setImg.naturalHeight);
            canvas.width = setImg.width * scale;
            canvas.height = setImg.height * scale;
            drawHolds(canvas, holds);
        }
    });

    function recenter(pz: PanZoom) {
        if (!setImg) return;
        pz.zoomAbs(0, 0, 1);
        let zoom = Math.min(
            container.clientWidth / setImg.width,
            container.clientHeight / setImg.height
        );
        pz.zoomTo(0, 0, zoom);
        pz.moveTo(
            (container.clientWidth - zoom * setImg.width) / 2,
            (container.clientHeight - zoom * setImg.height) / 2
        );
    }

    function drawHold(
        ctx: CanvasRenderingContext2D,
        contours: number[][] | undefined,
        setStyle: Function,
        separatePath: boolean = true
    ) {
        if (!contours) return;
        setStyle(ctx);
        for (let j = 0; j < contours.length; j++) {
            if (separatePath) ctx.beginPath();
            const contourPoly = contours[j];
            ctx.moveTo(contourPoly[0] * scale, contourPoly[1] * scale);
            for (let k = 2; k < contourPoly.length; k += 2) {
                ctx.lineTo(contourPoly[k] * scale, contourPoly[k + 1] * scale);
            }
            ctx.lineTo(contourPoly[0] * scale, contourPoly[1] * scale);
            if (separatePath) {
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    function drawHolds(canvas: HTMLCanvasElement, holds: Hold[]) {
        const ctx = canvas.getContext('2d');
        if (!setImg || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        for (let hold of holds) {
            drawHold(ctx, hold?.contours, () => {}, false);
        }
        ctx.clip();
        ctx.drawImage(setImg, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = HOLD_CONTOUR_WIDTH * scale;
        for (let hold of holds) {
            drawHold(ctx, hold?.contours, HOLD_STYLE_FUNCTIONS[hold?.style || 'default']);
        }
    }

    function handleClick(e: MouseEvent) {
        if (!(holds instanceof Array)) return;
        let candidates = holds.filter(
            (h) =>
                h.top <= e.offsetY &&
                h.bottom >= e.offsetY &&
                h.left <= e.offsetX &&
                h.right >= e.offsetX
        );
        if (candidates.length == 0) {
            return;
        } else if (candidates.length == 1) {
            handleHoldClick(candidates[0]);
        } else {
            // choose the hold with center closest to the click
            let bestDistance = Infinity;
            let bestHold = candidates[0];
            for (let candidate of candidates) {
                let distance =
                    ((candidate.right + candidate.left) / 2 - e.offsetX) ** 2 +
                    ((candidate.bottom + candidate.top) / 2 - e.offsetY) ** 2;
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestHold = candidate;
                }
            }
            handleHoldClick(bestHold);
        }
    }

    function handleHoldClick(hold: Hold) {
        if (editor) {
            selectedHold = hold;
        }
        if (onHoldClick instanceof Function) {
            onHoldClick(hold.id);
        }
    }

    let resizingDir: string | undefined = $state();
    function startHoldResize(e: MouseEvent, dir: string) {
        e.preventDefault();
        e.stopPropagation();
        resizingDir = dir;
    }
    function resizeHold(x: number, y: number) {
        // TODO: very verbose
        if (!selectedHold) return;
        if (resizingDir == 'left') {
            selectedHold.left = Math.min(x, selectedHold.right - OUTLINE_WIDTH * scale);
        } else if (resizingDir == 'top') {
            selectedHold.top = Math.min(y, selectedHold.bottom - OUTLINE_WIDTH * scale);
        } else if (resizingDir == 'right') {
            selectedHold.right = Math.max(x, selectedHold.left + OUTLINE_WIDTH * scale);
        } else if (resizingDir == 'bottom') {
            selectedHold.bottom = Math.max(y, selectedHold.top + OUTLINE_WIDTH * scale);
        }
    }

    function handleResizeKeyPress(e: KeyboardEvent, buttonDir: string) {
        console.log(e.key);
        if (!selectedHold) return;
        let delta;
        if (['a', 'w', 'A', 'W'].includes(e.key)) {
            delta = -10 * scale;
        } else if (['d', 's', 'D', 'S'].includes(e.key)) {
            delta = 10 * scale;
        } else {
            console.log('unknown key');
            return;
        }
        // just typescript things
        selectedHold[buttonDir as Extract<keyof Hold, 'left' | 'top' | 'right' | 'bottom'>] +=
            delta;
        // TODO: debounce this
        onHoldResize(selectedHold.id);
    }
</script>

<main bind:this={container}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        id="viewer"
        bind:this={viewer}
        onpointerdown={handleClick}
        onpointermove={(e) => {
            if (resizingDir) {
                resizeHold(e.offsetX, e.offsetY);
            }
        }}
        onpointerup={(e) => {
            if (resizingDir) {
                resizingDir = undefined;
                if (selectedHold) {
                    onHoldResize(selectedHold.id);
                }
            }
        }}
    >
        {#if typeof imageUrl === 'string'}
            <img bind:this={setImg} src={imageUrl} alt="The Set being viewed" />
            <canvas bind:this={canvas}></canvas>
            <!-- keyboard accessible interface -->
            {#each holds instanceof Array ? holds.toSorted((a, b) => a.top - b.top) : [] as hold}
                <button
                    class="hold"
                    title="Hold Number {hold.id}"
                    style="
                        left:{hold.left}px;top:{hold.top}px;
                        width:{hold.right -
                        hold.left -
                        OUTLINE_WIDTH * scale}px;height:{hold.bottom -
                        hold.top -
                        OUTLINE_WIDTH * scale}px;
                        margin: {(OUTLINE_WIDTH / 2) * scale}px;
                        outline-width: {OUTLINE_WIDTH * scale}px;
                    "
                    onclick={() => handleHoldClick(hold)}
                ></button>
                {#if editor && selectedHold?.id == hold.id}
                    <!-- TODO: make this button active when hold selected -->
                    <button
                        class="hold selected"
                        title="Selected Hold: {selectedHold.id}"
                        tabindex="-1"
                        style="
                            left:{selectedHold.left}px;top:{selectedHold.top}px;
                            width:{selectedHold.right -
                            selectedHold.left -
                            OUTLINE_WIDTH * scale}px;height:{selectedHold.bottom -
                            selectedHold.top -
                            OUTLINE_WIDTH * scale}px;
                            margin: {(OUTLINE_WIDTH / 2) * scale}px;
                            outline-width: {OUTLINE_WIDTH * scale}px;
                        "
                    ></button>
                    {#each Object.keys(DIRS) as dir}
                        <button
                            class="resizeHandle {resizingDir !== undefined ? 'resizing' : ''}"
                            style="
                                left:{selectedHold.left * DIRS[dir][0] +
                                selectedHold.right * DIRS[dir][2]}px;
                                top:{selectedHold.top * DIRS[dir][1] +
                                selectedHold.bottom * DIRS[dir][3]}px;
                                border-width: {OUTLINE_WIDTH * scale}px;
                            "
                            onpointerdown={(e) => {
                                startHoldResize(e, dir);
                            }}
                            onkeypress={(e) => {
                                handleResizeKeyPress(e, dir);
                                e.stopPropagation();
                            }}
                        ></button>
                    {/each}
                {/if}
            {/each}
        {/if}
    </div>
</main>
<button id="recenter" class="buttonDark" title="Recenter" onclick={() => recenter(panzoom)}>
    <RecenterIcon />
</button>

<style>
    main {
        flex: 1 1 20em;
        background: var(--background-nogradient);
        overflow: hidden;
        position: relative;
    }

    main::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-shadow: inset 0 0 10px 0px rgba(0, 0, 0, 0.5);
        pointer-events: none;
    }

    #viewer {
        display: inline-block;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
    }

    .hold {
        position: absolute;
        background-color: transparent;
        pointer-events: none;
        box-sizing: border-box;
    }
    .hold:focus {
        outline: dashed red;
    }
    .hold.selected {
        outline: solid red;
    }

    .resizeHandle {
        position: absolute;
        padding: 0;
        box-sizing: border-box;
        width: 3em;
        height: 3em;
        border: solid red;
        border-radius: 6em;
        background-color: white;
        transform: translate(-50%, -50%);
    }
    .resizeHandle.resizing {
        pointer-events: none;
    }

    #recenter {
        display: flex;
        position: absolute;
        top: var(--inset);
        right: var(--inset);
        box-shadow: 0 0 10px 0px rgba(0, 0, 0, 0.5);
    }
</style>
