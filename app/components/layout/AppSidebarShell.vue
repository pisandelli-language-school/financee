<script setup lang="ts">
import type { AppMenuItem } from '~/composables/useBackofficeNavigation'

const props = defineProps<{
  items: AppMenuItem[]
  menuScopeKey: string
  collapsed: boolean
  loading: boolean
  hasUser: boolean
}>()

const emit = defineEmits<{
  (event: 'update:collapsed', value: boolean): void
}>()

const menuRef = ref<{
  collapse: () => void
  expand: () => void
  toggle: () => void
} | null>(null)

function toggleSidebar() {
  if (menuRef.value) {
    menuRef.value.toggle()
    return
  }

  emit('update:collapsed', !props.collapsed)
}
</script>

<template lang="pug">
dd-sidebar(fill subtle :class="[fin.layout, collapsed && fin.layoutCollapsed]")
  aside(:class="fin.aside")
    dd-card(:scroll="!collapsed" :class="fin.menuShell")
      dd-stack(split-after="1" :class="fin.flow")
        dd-stack(compact)
          dd-menu(
            :key="menuScopeKey"
            ref="menuRef"
            :class="fin.menu"
            :items="items"
            collapsible
            :collapsed="collapsed"
            @update:collapsed="emit('update:collapsed', $event)"
          )
          div(
            v-if="loading && hasUser"
            :class="fin.menuSkeleton"
          )
            dd-cluster(v-for="item in 3" :key="item" compact :class="fin.menuSkeletonRow")
              dd-skeleton(
                v-if="collapsed"
                circle
                width="1.5rem"
                height="1.5rem"
              )
              template(v-else)
                dd-skeleton(circle width="1.5rem" height="1.5rem")
                dd-skeleton(height="1rem" width="8rem" radius="999px")
        dd-center(:class="fin.menuToggle")
          dd-button(
            ghost
            small
            :icon="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-right-open'"
            @click="toggleSidebar"
          )
            span(v-if="!collapsed") Recolher menu
  dd-box(tag="main" :class="fin.content")
    slot
</template>

<style module="fin">
.menuToggle {
  padding-block: v('space.sm');
}
.menuShell {
  --dd-card-body-padding: v('space.xs');
  flex: 1;
  min-block-size: 0;
}

.layout {
  --dd-sidebar-column-size: 15rem;
  --dd-sidebar-gap: 0;
  block-size: 100%;
  min-block-size: 0;
  padding-inline: v('space.md');
}

.layoutCollapsed {
  --dd-center-gap: 0;
  --dd-sidebar-column-size: 4.5rem;
  .menuShell {
    overflow: visible !important;
  }
}

.aside {
  block-size: 100%;
  display: flex;
  flex-direction: column;
  min-block-size: 0;
  padding-block: v('space.sm');
  transition: padding v('transition.slow');
}

.layout > :first-child {
  min-inline-size: 0;
  transition: flex-basis v('transition.slow');
}

.flow {
  block-size: 100%;
  min-block-size: 0;
}

.menu {
  --dd-menu-submenu-padding-inline-start: v('space.xs');
  --dd-menu-width: 100%;
  --dd-menu-width-collapsed: 100%;
  inline-size: 100%;
}

.menuSkeleton {
  padding-block-start: v('space.xs');
}

.menuSkeletonRow {
  align-items: center;
  min-block-size: 2rem;
}

.content {
  --dd-box-gap: v('space.md');
  background: v('color.bg.canvas');
  block-size: 100%;
  color: v('color.text.default');
  min-block-size: 0;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
