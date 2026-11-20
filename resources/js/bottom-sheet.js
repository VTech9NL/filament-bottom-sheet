/**
 * The `x-bottom-sheet` Alpine directive.
 *
 * It gives a Filament modal window one of three window types at each width:
 * a native bottom sheet (the default), the Filament modal (from the
 * `data-bottom-sheet-modal-from` width) or the Filament slide-over (from the
 * `data-bottom-sheet-slide-over-from` width). A resize changes the type of an
 * open window, with no close: it is the same window and the same form.
 *
 * Filament keeps the modal itself: open and close, the scroll lock, the focus
 * trap, Escape, the backdrop tap and the nested modal stack (`modal.js`).
 */

// The classes are literal strings, so the Tailwind build of the panel theme
// finds them with `@source`. The host element has `wire:ignore.self`, so a
// Livewire update keeps them.
const MODAL_CLASSES = [
    'fi-bottom-sheet',
    'fixed',
    'inset-x-0',
    'bottom-0',
    'top-auto',
    'm-0',
    'w-full',
    'max-w-none',
    'max-h-dvh',
    'flex',
    'flex-col',
    'overflow-hidden',
    'rounded-t-2xl',
    'rounded-b-none',
    'pb-[env(safe-area-inset-bottom)]',
    'will-change-transform',
    // The stack: the sheet under a new sheet moves back.
    'origin-bottom',
    'transition-[scale]',
    'duration-300',
    'motion-reduce:transition-none',
    // The drag handle.
    'before:mx-auto',
    'before:mt-2',
    'before:block',
    'before:h-1.5',
    'before:w-10',
    'before:shrink-0',
    'before:rounded-full',
    'before:bg-gray-300',
    'dark:before:bg-gray-600',
    // The header stays at the top and moves the sheet.
    '[&>.fi-modal-header]:shrink-0',
    '[&>.fi-modal-header]:touch-none',
    '[&>.fi-modal-header]:select-none',
    '[&>.fi-modal-header]:pt-3',
    // No close button while it is a sheet.
    '[&_.fi-modal-close-btn]:hidden',
    // The body scrolls.
    '[&>.fi-modal-content]:min-h-0',
    '[&>.fi-modal-content]:flex-1',
    '[&>.fi-modal-content]:overflow-y-auto',
    '[&>.fi-modal-content]:overscroll-contain',
    // The footer stays at the bottom.
    '[&>.fi-modal-footer]:shrink-0',
]

const MODAL_BACK_CLASSES = ['scale-94']

// The Filament classes of a slide-over, on the modal root
// (`components/modal/index.blade.php`). The sticky header and footer are the
// defaults of a Filament slide-over action.
const SLIDE_OVER_CLASSES = [
    'fi-modal-slide-over',
    'fi-modal-has-sticky-header',
    'fi-modal-has-sticky-footer',
]

const SLIDE_OVER_POSITION_CLASSES = {
    start: 'fi-modal-slide-over-from-start',
    end: 'fi-modal-slide-over-from-end',
}

// The root classes that the window type changes. In the other types, the
// root keeps these classes as the server renders them.
const TYPE_CLASSES = [
    ...SLIDE_OVER_CLASSES,
    ...Object.values(SLIDE_OVER_POSITION_CLASSES),
]

// The part of the viewport height at which the sheet opens when the content
// height cannot be measured.
const FALLBACK_HEIGHT = 0.5

// A release faster than this, in px per ms, is a flick.
const FLICK_VELOCITY = 0.5

// A release this part of the lowest height below the lowest height closes.
const DISMISS_DISTANCE = 0.25

// A drag above the highest snap point moves the sheet by this part only.
const RUBBER_BAND = 0.25

const SPRING_STIFFNESS = 380

const SPRING_DAMPING_RATIO = 0.86

const NOT_DRAGGABLE = 'input, textarea, select, button, a, [contenteditable]'

// The open sheets, from the lowest to the topmost. Each sheet under the
// topmost one moves back, as the iOS sheets do.
const stack = []

// The topmost sheet keeps the `z-40` of its classes (a Filament modal also has
// `z-40`). Each sheet under it gets a lower layer, so the sheet that opened
// last is on top, whatever its place in the DOM.
const TOP_LAYER = 40

const LOWEST_LAYER = 31

const updateStack = () =>
    stack.forEach((sheet, index) => {
        const depth = stack.length - 1 - index

        sheet.moveBack(depth > 0)
        sheet.setLayer(depth && Math.max(TOP_LAYER - depth, LOWEST_LAYER))
    })

// The stack place of a sheet that starts again with new options, so it keeps
// its place under the sheets that opened after it.
let restartIndex = null

const pushSheet = (sheet) => {
    if (!stack.includes(sheet)) {
        stack.splice(restartIndex ?? stack.length, 0, sheet)
    }

    restartIndex = null

    updateStack()
}

const removeSheet = (sheet) => {
    const index = stack.indexOf(sheet)

    if (index !== -1) {
        stack.splice(index, 1)
    }

    sheet.moveBack(false)
    sheet.setLayer(0)
    updateStack()
}

const isTopmostSheet = (sheet) => stack[stack.length - 1] === sheet

const readOptions = (el) => ({
    snapPoints: JSON.parse(el.dataset.bottomSheetSnapPoints || '[0.5,0.8,1]'),
    initialHeight:
        el.dataset.bottomSheetInitialHeight === 'content'
            ? 'content'
            : parseFloat(el.dataset.bottomSheetInitialHeight) ||
              FALLBACK_HEIGHT,
})

/**
 * The sheet motion and the drag.
 *
 * The part gives:
 * - `host`: the element with `wire:ignore.self`, that gets the classes;
 * - `sheet()`: the element that moves, and that the drag starts in;
 * - `content()`: the body that scrolls;
 * - `footerSelector`: the footer, where a drag does not start;
 * - `classes` and `backClasses`;
 * - `render(height, offset)` and `clear()`, for the sheet frame;
 * - `layers()`: the elements that get the stack layer (`z-index`);
 * - `isShown()`: the sheet element is shown;
 * - `requestClose()`: close the part, as the user asks for it.
 */
const createSheet = (part) => {
    const { host } = part
    const options = readOptions(host)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sheet = {
        isActive: false,
        // The visible height of the sheet, in px.
        position: 0,
    }

    // The heights where the sheet can rest, in px, from low to high.
    let rests = []
    let frame = null
    let drag = null

    const viewportHeight = () => window.innerHeight

    const lowest = () => rests[0] ?? 0

    const highest = () => rests[rests.length - 1] ?? viewportHeight()

    const render = () => {
        const height = Math.min(
            Math.max(sheet.position, lowest()),
            viewportHeight(),
        )
        const offset = Math.max(0, lowest() - sheet.position)

        part.render(height, offset)
    }

    const measureRests = () => {
        const height = viewportHeight()
        const snaps = options.snapPoints.map((point) => point * height)
        const max = Math.max(...snaps)

        let initial

        if (options.initialHeight === 'content') {
            part.render('auto', 0)

            const contentHeight = part.sheet()?.getBoundingClientRect().height

            initial = Math.min(
                contentHeight > 0 ? contentHeight : FALLBACK_HEIGHT * height,
                max,
            )
        } else {
            initial = Math.min(options.initialHeight * height, max)
        }

        rests = [...new Set([...snaps, initial].map(Math.round))].sort(
            (a, b) => a - b,
        )

        return Math.round(initial)
    }

    const stop = () => {
        if (frame) {
            cancelAnimationFrame(frame)
            frame = null
        }
    }

    // A damped spring from the current position to the target. The velocity
    // is in px per ms, positive upwards.
    const springTo = (target, velocity = 0, onDone = null) => {
        stop()

        if (reducedMotion.matches) {
            sheet.position = target
            render()
            onDone?.()

            return
        }

        const damping = 2 * Math.sqrt(SPRING_STIFFNESS) * SPRING_DAMPING_RATIO
        let speed = velocity * 1000
        let last = performance.now()

        const step = (now) => {
            const elapsed = Math.min((now - last) / 1000, 0.064)
            const substeps = 4
            const dt = elapsed / substeps

            last = now

            for (let i = 0; i < substeps; i++) {
                const acceleration =
                    -SPRING_STIFFNESS * (sheet.position - target) -
                    damping * speed

                speed += acceleration * dt
                sheet.position += speed * dt
            }

            if (
                Math.abs(sheet.position - target) < 0.5 &&
                Math.abs(speed) < 10
            ) {
                sheet.position = target
                render()
                frame = null
                onDone?.()

                return
            }

            render()
            frame = requestAnimationFrame(step)
        }

        frame = requestAnimationFrame(step)
    }

    // Move the sheet down out of the screen, then call `onDone`. Below 0, so
    // the shadow also leaves the screen.
    sheet.slideOut = (velocity = 0, onDone = null) =>
        springTo(-24, Math.min(velocity, 0), onDone)

    const dismiss = (velocity = 0) =>
        sheet.slideOut(velocity, () => part.requestClose())

    sheet.open = () => {
        stop()
        part.render(null, '100%')

        // Wait for `x-show` to show the sheet, so its height
        // can be measured.
        let tries = 0

        const start = () => {
            if (!sheet.isActive || !part.isShown()) {
                return
            }

            if (!part.sheet()?.getClientRects().length && tries++ < 10) {
                frame = requestAnimationFrame(start)

                return
            }

            const initial = measureRests()

            sheet.position = 0
            render()
            springTo(initial)
        }

        frame = requestAnimationFrame(start)
    }

    const nearest = (value) =>
        rests.reduce((best, rest) =>
            Math.abs(rest - value) < Math.abs(best - value) ? rest : best,
        )

    // Put the sheet at a rest point with no animation, for example after a
    // resize to the sheet type while it is open.
    sheet.place = () => {
        stop()

        const ratio = sheet.position / (highest() || 1)
        const initial = measureRests()

        sheet.position = sheet.position
            ? nearest(ratio * highest())
            : initial
        render()
    }

    const settle = (velocity) => {
        const isFlick = Math.abs(velocity) > FLICK_VELOCITY

        if (sheet.position < lowest() * (1 - DISMISS_DISTANCE)) {
            dismiss(velocity)

            return
        }

        if (!isFlick) {
            springTo(nearest(sheet.position), velocity)

            return
        }

        if (velocity > 0) {
            springTo(
                rests.find((rest) => rest > sheet.position + 1) ?? highest(),
                velocity,
            )

            return
        }

        const below = rests.filter((rest) => rest < sheet.position - 1)

        if (!below.length) {
            dismiss(velocity)

            return
        }

        springTo(below[below.length - 1], velocity)
    }

    // True when the body, or a scroll area in it under the pointer, is not at
    // the top of its scroll.
    const isScrolled = (target) => {
        const body = part.content()
        const root = part.sheet()

        for (
            let node = target;
            node && node !== root;
            node = node.parentElement
        ) {
            if (node.scrollTop > 0) {
                return true
            }

            if (node === body) {
                break
            }
        }

        return false
    }

    const startDrag = (y, target, isTouch) => {
        if (!sheet.isActive || !sheet.isOpen() || !target) {
            return
        }

        // The sheet under the topmost one does not move.
        if (!isTopmostSheet(sheet)) {
            return
        }

        if (!part.sheet()?.contains(target)) {
            return
        }

        const body = part.content()
        const isInBody = !!body?.contains(target)
        const isInFooter = !!target.closest(part.footerSelector)

        if (isInFooter || (!isInBody && target.closest(NOT_DRAGGABLE))) {
            return
        }

        // A mouse does not drag the body: a wheel scrolls it.
        if (isInBody && !isTouch) {
            return
        }

        drag = {
            startY: y,
            startPosition: sheet.position,
            mode: isInBody ? 'pending' : 'sheet',
            target,
            samples: [{ time: performance.now(), y }],
        }

        if (drag.mode === 'sheet') {
            stop()
        }
    }

    const moveDrag = (y, event) => {
        if (!drag) {
            return
        }

        if (drag.mode === 'scroll') {
            const isDown = y > drag.lastY

            drag.lastY = y

            // The body scrolls down to its top: the same drag moves the sheet
            // from there.
            if (!isDown || isScrolled(drag.target)) {
                return
            }

            drag.mode = 'sheet'
            drag.startY = y
            drag.startPosition = sheet.position
            drag.samples = [{ time: performance.now(), y }]
            stop()
        }

        if (drag.mode === 'pending') {
            if (y === drag.startY) {
                return
            }

            const isDown = y > drag.startY
            const canMoveUp = sheet.position < highest() - 1

            if (
                (isDown && !isScrolled(drag.target)) ||
                (!isDown && canMoveUp)
            ) {
                drag.mode = 'sheet'
                drag.startY = y
                drag.startPosition = sheet.position
                stop()
            } else {
                drag.mode = 'scroll'
                drag.lastY = y

                return
            }
        }

        if (event.cancelable) {
            event.preventDefault()
        }

        let next = drag.startPosition + (drag.startY - y)

        if (next > highest()) {
            next = highest() + (next - highest()) * RUBBER_BAND
        }

        sheet.position = next
        render()

        const now = performance.now()

        drag.samples.push({ time: now, y })
        drag.samples = drag.samples.filter((sample) => now - sample.time < 100)
    }

    const endDrag = () => {
        if (!drag) {
            return
        }

        const { mode, samples } = drag

        drag = null

        if (mode !== 'sheet') {
            return
        }

        const first = samples[0]
        const last = samples[samples.length - 1]
        const elapsed = last.time - first.time
        // Positive upwards, in px per ms.
        const velocity = elapsed > 0 ? (first.y - last.y) / elapsed : 0

        settle(velocity)
    }

    const onTouchStart = (event) =>
        event.touches.length === 1 &&
        startDrag(event.touches[0].clientY, event.target, true)

    const onTouchMove = (event) =>
        drag && moveDrag(event.touches[0].clientY, event)

    const onPointerMove = (event) => moveDrag(event.clientY, event)

    const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        endDrag()
    }

    const onPointerDown = (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) {
            return
        }

        startDrag(event.clientY, event.target, false)

        if (drag) {
            window.addEventListener('pointermove', onPointerMove)
            window.addEventListener('pointerup', onPointerUp, { once: true })
        }
    }

    // Stop the motion and the drag, for example when the part closes.
    sheet.halt = () => {
        stop()
        drag = null
    }

    sheet.isDragging = () => !!drag

    sheet.moveBack = (isBack) =>
        part.backClasses.forEach((name) =>
            host.classList.toggle(name, isBack && sheet.isActive),
        )

    sheet.setLayer = (layer) =>
        part.layers().forEach((element) => {
            element.style.zIndex = layer && sheet.isActive ? `${layer}` : ''
        })

    sheet.activate = () => {
        sheet.isActive = true
        host.classList.add(...part.classes)
    }

    sheet.deactivate = () => {
        sheet.isActive = false
        sheet.halt()
        removeSheet(sheet)
        host.classList.remove(...part.classes, ...part.backClasses)
        part.clear()
    }

    host.addEventListener('touchstart', onTouchStart, { passive: true })
    host.addEventListener('touchmove', onTouchMove, { passive: false })
    host.addEventListener('touchend', endDrag)
    host.addEventListener('touchcancel', endDrag)
    host.addEventListener('pointerdown', onPointerDown)

    sheet.destroy = () => {
        sheet.deactivate()
        host.removeEventListener('touchstart', onTouchStart)
        host.removeEventListener('touchmove', onTouchMove)
        host.removeEventListener('touchend', endDrag)
        host.removeEventListener('touchcancel', endDrag)
        host.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
    }

    return sheet
}

const createModalSheet = (Alpine, el, isRestart = false) => {
    const root = el.closest('.fi-modal')

    if (!root) {
        return null
    }

    const modal = Alpine.$data(el)

    const sheet = createSheet({
        host: el,
        sheet: () => el,
        content: () => el.querySelector(':scope > .fi-modal-content'),
        footerSelector: '.fi-modal-footer',
        classes: MODAL_CLASSES,
        backClasses: MODAL_BACK_CLASSES,
        layers: () =>
            root.querySelectorAll(
                ':scope > .fi-modal-close-overlay, :scope > .fi-modal-window-ctn',
            ),
        render: (height, offset) => {
            if (height !== null) {
                el.style.height = height === 'auto' ? 'auto' : `${height}px`
            }

            el.style.transform =
                offset === '100%'
                    ? 'translate3d(0, 100%, 0)'
                    : offset
                      ? `translate3d(0, ${offset}px, 0)`
                      : ''
        },
        clear: () => {
            el.style.removeProperty('height')
            el.style.removeProperty('transform')
        },
        isShown: () => modal.isWindowVisible,
        requestClose: () => {
            if (root.id) {
                window.dispatchEvent(
                    new CustomEvent('close-modal', {
                        detail: { id: root.id },
                    }),
                )

                return
            }

            root.dispatchEvent(new CustomEvent('close-modal'))
        },
    })

    sheet.isOpen = () => modal.isOpen

    // The window types from a breakpoint, from the widest breakpoint to the
    // narrowest. Below each breakpoint, the window is a sheet.
    const types = [
        ['modal', el.dataset.bottomSheetModalFrom],
        ['slideOver', el.dataset.bottomSheetSlideOverFrom],
    ]
        .filter(([, width]) => width)
        .sort(([, a], [, b]) => parseFloat(b) - parseFloat(a))
        .map(([name, width]) => ({
            name,
            query: window.matchMedia(`(min-width: ${width})`),
        }))
    const slideOverClasses = [
        ...SLIDE_OVER_CLASSES,
        SLIDE_OVER_POSITION_CLASSES[
            el.dataset.bottomSheetSlideOverPosition === 'start'
                ? 'start'
                : 'end'
        ],
    ]

    // The type classes of the root, as the server renders them.
    let serverClasses = TYPE_CLASSES.filter((name) =>
        root.classList.contains(name),
    )
    let type = null

    const currentType = () =>
        types.find(({ query }) => query.matches)?.name ?? 'sheet'

    const applyType = (target) => {
        const names = type === 'slideOver' ? slideOverClasses : serverClasses

        TYPE_CLASSES.forEach((name) =>
            target.classList.toggle(name, names.includes(name)),
        )
    }

    // The root has no `wire:ignore.self`, and Filament updates the action
    // modals with its own morph (`partials.js`), with no Livewire morph hook.
    // When an update gives the root its server classes again, the observer
    // keeps them as the server state and gives the slide-over classes again,
    // before the next paint.
    const observer = new MutationObserver(() => {
        const current = TYPE_CLASSES.filter((name) =>
            root.classList.contains(name),
        )

        if (type !== 'slideOver') {
            serverClasses = current
        } else if (
            current.length !== slideOverClasses.length ||
            !slideOverClasses.every((name) => current.includes(name))
        ) {
            serverClasses = current
            applyType(root)
        }
    })

    const onTypeChange = () => {
        const next = currentType()

        if (next === type) {
            return
        }

        type = next
        applyType(root)

        if (type !== 'sheet') {
            sheet.deactivate()

            return
        }

        sheet.activate()

        if (modal.isWindowVisible) {
            pushSheet(sheet)
            sheet.place()
        }
    }

    const onResize = () =>
        sheet.isActive &&
        modal.isWindowVisible &&
        !sheet.isDragging() &&
        sheet.place()

    types.forEach(({ query }) =>
        query.addEventListener('change', onTypeChange),
    )
    window.addEventListener('resize', onResize)

    type = currentType()
    applyType(root)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    if (type === 'sheet') {
        sheet.activate()
    }

    const visibility = Alpine.effect(() => {
        // New options while the modal is open: no new open animation.
        const shouldPlace = isRestart

        isRestart = false

        if (!modal.isWindowVisible) {
            // Filament closes the modal: the leave transition in
            // `bottom-sheet.css` moves the sheet down.
            // Filament gives the focus back to the opening button
            // (`filamentActionModals`).
            sheet.halt()
            removeSheet(sheet)

            return
        }

        if (!sheet.isActive) {
            return
        }

        pushSheet(sheet)
        shouldPlace ? sheet.place() : sheet.open()
    })

    return () => {
        const index = stack.indexOf(sheet)

        Alpine.release(visibility)
        sheet.destroy()
        types.forEach(({ query }) =>
            query.removeEventListener('change', onTypeChange),
        )
        window.removeEventListener('resize', onResize)

        // The root gets its server classes again.
        observer.disconnect()
        type = null
        applyType(root)

        return { index }
    }
}

// The attributes of `BottomSheet::attributes()` that the directive reads.
const OPTION_ATTRIBUTES = [
    'data-bottom-sheet-modal-from',
    'data-bottom-sheet-slide-over-from',
    'data-bottom-sheet-slide-over-position',
    'data-bottom-sheet-snap-points',
    'data-bottom-sheet-initial-height',
]

// The sheet state of the markup: null when the element is not a sheet.
const stateOf = (el) =>
    el.hasAttribute('x-bottom-sheet')
        ? OPTION_ATTRIBUTES.map((name) => el.getAttribute(name)).join('|')
        : null

// `wire:ignore.self` keeps the classes and styles of the directive, so a
// Livewire update does not change the attributes of the window. Before each
// update, the directive compares the new markup with its state: when the
// condition or an option changes, it starts again with the new state.
const onMorph = ({ el, toEl }) => el._bottomSheetSync?.(toEl)

const plugin = (Alpine) => {
    if (window.Livewire) {
        window.Livewire.hook('morph.updating', onMorph)
    } else {
        document.addEventListener('livewire:init', () =>
            window.Livewire.hook('morph.updating', onMorph),
        )
    }

    // A Livewire update clones the Alpine components of the page into
    // elements that are not in the page. A sheet on such a clone would listen
    // to the window events, so the directive skips the clones.
    Alpine.directive(
        'bottom-sheet',
        Alpine.skipDuringClone((el, _directive, { cleanup }) => {
            if (!el.isConnected) {
                return
            }

            let state = stateOf(el)
            let destroy = createModalSheet(Alpine, el)

            el.__livewire_ignore_self = true

            el._bottomSheetSync = (toEl) => {
                const next = stateOf(toEl)

                if (next === state) {
                    return
                }

                const { index = -1 } = destroy?.() ?? {}

                destroy = null
                state = next

                // No sheet now: the update gives the element its new
                // attributes, and Alpine removes the directive.
                if (next === null) {
                    el.__livewire_ignore_self = false

                    return
                }

                for (const name of OPTION_ATTRIBUTES) {
                    toEl.hasAttribute(name)
                        ? el.setAttribute(name, toEl.getAttribute(name))
                        : el.removeAttribute(name)
                }

                el.__livewire_ignore_self = true
                restartIndex = index === -1 ? null : index
                destroy = createModalSheet(Alpine, el, true)
                restartIndex = null
            }

            cleanup(() => {
                destroy?.()
                destroy = null
                delete el._bottomSheetSync
            })
        }),
    )
}

if (window.Alpine) {
    window.Alpine.plugin(plugin)
} else {
    document.addEventListener('alpine:init', () => window.Alpine.plugin(plugin))
}
