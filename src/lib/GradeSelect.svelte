<script lang="ts">
    // TODO: again, prevent double render
    //       (maybe just wait for Svelte 5 which should have a fix for this)
	import ChevronDownIcon from './icons/ChevronDownIcon.svelte';
    import { grades } from './grades';
    import { createSelect, melt } from '@melt-ui/svelte'
	import { userSettingsStore } from './pocketbase';

    export let selectedGrade:number;
    $: selectedGrade = Number($selected?.value);

    let system = "v";
    let options = buildGradeOptions();
    $: if ($userSettingsStore?.grading_system != system) {
        system = $userSettingsStore?.grading_system;
        options = buildGradeOptions();
    }

    const {
        elements: { trigger, menu, option, group, groupLabel, label },
        states: { selectedLabel, selected, open },
        helpers: { isSelected },
    } = createSelect<string>({
        defaultSelected: options.find((e) => e.value == selectedGrade),
        forceVisible: true,
        positioning: {
        placement: 'bottom',
        fitViewport: true,
        sameWidth: true,
        },
    });

    function buildGradeOptions() {
        let options = [];
        let groups = Object.groupBy(grades, (e, i) => e[system]);
        for (let label in groups) {
            let selectedGradeI = groups[label].findIndex((e) => e.id == selectedGrade)
            // if the selected grade is in this group, use that grade as the
            // displayed option for the group (prevents grade "laddering")
            if (selectedGradeI >= 0) {
                options.push({
                    label: label,
                    value: groups[label][selectedGradeI].id
                });
            } else {
                // otherwise use the middle grade in the group
                // TODO: does Object.groupBy maintain order?
                options.push({
                    label: label,
                    value: groups[label][Math.floor(groups[label].length / 2)].id
                });
            }
        }
        return options;
    }
</script>

<style>
    main {
        position: relative;
        width: 100%;
        background-color: var(--color-major);
    }

    .trigger {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 1em;
    }

    .optionsContainer {
        width: 100%;
        position: absolute;
        overflow: hidden;
        box-shadow: 0 0 5px black;
        border-radius: calc(var(--primary-radius) - 5px);
    }

    .options {
        width: 100%;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-height: 20em;
        overflow-y: auto;
        background-color: white;
    }

    .options p {
        margin: 0;
        padding: 0.5em;
    }

    [data-highlighted] {
        background-color: var(--color-hover-background);
    }
</style>

<main>
    <button use:melt={$trigger} class="buttonDark trigger">
        {$selectedLabel || "--"}
        <ChevronDownIcon/>
    </button>
    {#if $open}
        <div use:melt={$menu} class="optionsContainer">
            <div class="options">
                {#each options as item}
                    <div use:melt={$option({value: item.value, label: item.label})}>
                        <p>{item.label}</p>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</main>