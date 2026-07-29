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
dd-sidebar(fill :class="[fin.layout, collapsed && fin.layoutCollapsed]")
  aside(:class="fin.aside")
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
        dd-stack(
          v-if="loading && hasUser"
          compact
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
      dd-center
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
.layout {
  --dd-sidebar-column-size: 15rem;
}

.layoutCollapsed {
  --dd-center-gap: 0;
  --dd-sidebar-column-size: 4.5rem;
}

.aside {
  background: v('color.bg.surface');
  border-right: v('border-width.sm') solid v('color.light-gray');
  min-block-size: 100%;
  padding: v('space.sm');
  transition: padding v('transition.slow');
}

.layout > :first-child {
  min-inline-size: 0;
  transition: flex-basis v('transition.slow');
}

.flow {
  min-block-size: 100%;
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

/* TODO: Remove when Daredash restores submenu spacing by default. */
.menu > ul > li[data-has-children] {
  display: grid;
  gap: v('space.xxs');
}

/* TODO: Remove when Daredash supports keeping the active parent group expanded by route. */
.menu > ul > li[data-active][data-has-children]:not([data-float]) > div {
  grid-template-rows: 1fr;
}

/* TODO: Remove when Daredash syncs the active route with the parent caret state. */
.menu > ul > li[data-active][data-has-children]:not([data-float]) > :first-child [class*="chevron"] {
  transform: rotate(90deg);
}

.content {
  --dd-box-gap: v('space.xxl');
  min-width: 0;
}
</style>
