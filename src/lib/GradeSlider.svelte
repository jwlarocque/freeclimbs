<script>
	import { Slider } from "bits-ui";
    import { grades } from "./grades";
    import debounce from "$lib/debounce";
	import { userSettingsStore } from "./pocketbase";

    let system = "v";
    let unique_grades = grades.filter((grade, index, self) => self.findIndex(g => g[system] === grade[system]) === index);
    let internalValue = [0, unique_grades.length - 1];
    $: if ($userSettingsStore?.grading_system != system) {
        system = $userSettingsStore?.grading_system;
        unique_grades = grades.filter((grade, index, self) => self.findIndex(g => g[system] === grade[system]) === index);
        internalValue = [0, unique_grades.length - 1];
    }
    
    export let externalValue = internalValue;
    $: console.log(externalValue);

    const debouncedSetValue = debounce((value) => {
        // set lower bound to index of first occurence of grade[SYSTEM] in grades
        externalValue[0] = grades.findIndex(grade => grade[system] === unique_grades[value[0]][system]);
        // set upper bound to index of last occurence of grade[SYSTEM] in grades
        externalValue[1] = grades.findLastIndex(grade => grade[system] === unique_grades[value[1]][system]);
    }, 200);

    $: debouncedSetValue(internalValue);
</script>

<style>
    p {
        text-align: center;
        margin: auto;
    }

    :global(.slider) {
        width: calc(100% - 3em);
        height: 2em;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        position: relative;
        margin: .5em auto;
        border-radius: var(--primary-radius);
    }

    :global(.slider-rail) {
        width: 100%;
        height: 3px;
        background-color: var(--color-minor);
        border-radius: var(--primary-radius);
        position: absolute;
    }

    :global(.slider-range-wrapper) {
        width: 100%;
        position: relative;
    }

    :global(.slider-range) {
        background-color: var(--color-background-two);
        height: 3px;
        border-radius: var(--primary-radius);
        z-index: 1;
        transform: translate(0%, -50%);
    }

    :global(.slider-thumb) {
        width: 1.5em;
        height: 1.5em;
        border-radius: 50%;
        border: var(--inset) solid var(--color-background);
        box-sizing: border-box;
        background-color: var(--color-major);
        transition: background-color 0.1s ease-in-out;
        top: 0.25em;
        left: 0;
        z-index: 2;
        cursor: pointer;
    }

    :global(.slider-thumb:hover) {
        background-color: var(--color-hover-background);
    }

    :global(.slider-tick) {
        width: 1px;
        height: 0.5em;
        border-radius: 50%;
        background-color: var(--color-greeblies);
        top: 0;
        left: 0;
        z-index: 1;
        cursor: pointer;
    }
</style>

{#if internalValue[0] == internalValue[1]}
    <p>{unique_grades[internalValue[0]][system]}</p>
{:else}
    <p>{unique_grades[internalValue[0]][system]} - {unique_grades[internalValue[1]][system]}</p>
{/if}
<Slider.Root
    min={0}
    max={unique_grades.length - 1}
    step={1}
    bind:value={internalValue}
    let:thumbs
    let:ticks
    class="slider"
>
    <span class="slider-rail"></span>
    <span class="slider-range-wrapper">
        <Slider.Range class="slider-range" />
    </span>
    {#each thumbs as thumb}
        <Slider.Thumb {thumb} class="slider-thumb"/>
    {/each}
    {#each ticks as tick}
        <Slider.Tick {tick} class="slider-tick"/>
    {/each}
    <Slider.Input />
</Slider.Root>
  
  