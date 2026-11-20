/**
 * The `x-bottom-sheet` Alpine directive.
 *
 * Below the breakpoint, it turns a Filament modal window, or a schema section
 * (`x-bottom-sheet.section`), into a native bottom sheet. At and above the
 * breakpoint, it does nothing.
 *
 * For a modal, Filament keeps the modal itself: open and close, the scroll
 * lock, the focus trap, Escape, the backdrop tap and the nested modal stack
 * (`modal.js`). A section has no modal, so the directive opens and closes it
 * on the `open-bottom-sheet` and `close-bottom-sheet` window events, binds the
 * Alpine focus plugin (`x-trap`) to trap the focus, and locks the page scroll.
 * It needs no `x-data` of its own, so the app can keep its `x-data` there.
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

// The section root is the backdrop, and its `<section>` is the sheet. The
// sheet height and offset are settings on the root, because Livewire updates
// the attributes of the `<section>`.
const SECTION_CLASSES = [
    'fi-bottom-sheet',
    'fixed',
    'inset-0',
    'z-40',
    'm-0',
    // The root takes the focus when the sheet opens, as the modal root does.
    'outline-none',
    'transition-colors',
    'duration-300',
    'motion-reduce:transition-none',
    'data-open:bg-gray-950/50',
    'dark:data-open:bg-gray-950/75',
    // Only the section shows, not its label or the schemas around it.
    '[&>:not(.fi-section)]:hidden',
    '[&>.fi-section]:absolute',
    '[&>.fi-section]:inset-x-0',
    '[&>.fi-section]:bottom-0',
    '[&>.fi-section]:flex',
    '[&>.fi-section]:flex-col',
    '[&>.fi-section]:h-(--bottom-sheet-height)',
    '[&>.fi-section]:max-h-dvh',
    '[&>.fi-section]:translate-y-(--bottom-sheet-offset)',
    '[&>.fi-section]:overflow-hidden',
    '[&>.fi-section]:rounded-t-2xl',
    '[&>.fi-section]:rounded-b-none',
    '[&>.fi-section]:bg-white',
    'dark:[&>.fi-section]:bg-gray-900',
    '[&>.fi-section]:shadow-xl',
    '[&>.fi-section]:pb-[env(safe-area-inset-bottom)]',
    '[&>.fi-section]:will-change-transform',
    '[&>.fi-section]:origin-bottom',
    '[&>.fi-section]:transition-[scale]',
    '[&>.fi-section]:duration-300',
    '[&>.fi-section]:motion-reduce:transition-none',
    // The drag handle.
    '[&>.fi-section]:before:mx-auto',
    '[&>.fi-section]:before:mt-2',
    '[&>.fi-section]:before:block',
    '[&>.fi-section]:before:h-1.5',
    '[&>.fi-section]:before:w-10',
    '[&>.fi-section]:before:shrink-0',
    '[&>.fi-section]:before:rounded-full',
    '[&>.fi-section]:before:bg-gray-300',
    'dark:[&>.fi-section]:before:bg-gray-600',
    // The header stays at the top and moves the sheet.
    '[&>.fi-section>.fi-section-header]:shrink-0',
    '[&>.fi-section>.fi-section-header]:touch-none',
    '[&>.fi-section>.fi-section-header]:select-none',
    // No collapse button while it is a sheet.
    '[&_.fi-section-collapse-btn]:hidden',
    // The body scrolls, and the footer actions stay at the bottom.
    '[&>.fi-section>.fi-section-content-ctn]:flex',
    '[&>.fi-section>.fi-section-content-ctn]:min-h-0',
    '[&>.fi-section>.fi-section-content-ctn]:flex-1',
    '[&>.fi-section>.fi-section-content-ctn]:flex-col',
    '[&_.fi-section-content-ctn>.fi-section-content]:min-h-0',
    '[&_.fi-section-content-ctn>.fi-section-content]:flex-1',
    '[&_.fi-section-content-ctn>.fi-section-content]:overflow-y-auto',
    '[&_.fi-section-content-ctn>.fi-section-content]:overscroll-contain',
    '[&_.fi-section-content-ctn>.fi-section-footer]:shrink-0',
]

const SECTION_BACK_CLASSES = ['[&>.fi-section]:scale-94']

// Hides a section sheet below the breakpoint before Alpine starts. The names
// match `BottomSheet::HIDDEN_BELOW`. The directive removes the class when it
// takes over, and then it hides the section itself.
const SECTION_CLOAK_CLASSES = [
    'max-sm:hidden',
    'max-md:hidden',
    'max-lg:hidden',
    'max-xl:hidden',
    'max-2xl:hidden',
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

const pushSheet = (sheet) => {
    if (!stack.includes(sheet)) {
        stack.push(sheet)
    }

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

// One Escape closes one sheet: the sheet that is topmost when the key event
// starts. The plugin adds this listener before Alpine starts, so it runs before
// the Escape listeners of the Filament modals. A modal sheet closes with its
// Filament modal; a section sheet stops the event, so the modal under it stays
// open.
const onEscape = (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
        stack[stack.length - 1]?.onEscape?.(event)
    }
}

// The section sheets lock the page scroll on `<body>`. The Filament modals lock
// it on `<html>` (`modal.js`). Each lock restores only its own element, so a
// close or a breakpoint change releases only its own lock, and the page scrolls
// again only when no lock is left.
let scrollLocks = 0
let restoreScroll = null

const lockScroll = () => {
    if (scrollLocks++ > 0) {
        return
    }

    const { style } = document.body
    const { overflow, paddingRight } = style
    const html = document.documentElement
    const scrollbarWidth = window.innerWidth - html.clientWidth
    const gutter = window.getComputedStyle(html).scrollbarGutter

    style.overflow = 'hidden'

    // A reserved scrollbar gutter already keeps the page width.
    if (scrollbarWidth > 0 && (!gutter || gutter === 'auto')) {
        style.paddingRight = `${scrollbarWidth}px`
    }

    restoreScroll = () => {
        style.overflow = overflow
        style.paddingRight = paddingRight
    }
}

const unlockScroll = () => {
    if (scrollLocks === 0 || --scrollLocks > 0) {
        return
    }

    restoreScroll?.()
    restoreScroll = null
}

const readOptions = (el) => ({
    until: el.dataset.bottomSheetUntil || '48rem',
    snapPoints: JSON.parse(el.dataset.bottomSheetSnapPoints || '[0.5,0.8,1]'),
    initialHeight:
        el.dataset.bottomSheetInitialHeight === 'content'
            ? 'content'
            : parseFloat(el.dataset.bottomSheetInitialHeight) ||
              FALLBACK_HEIGHT,
})

// Give the focus back to the element that had it before the section sheet
// opened, when the focus is not in an other open part now.
const restoreFocus = (opener, container) => {
    if (!opener?.isConnected) {
        return
    }

    requestAnimationFrame(() => {
        const active = document.activeElement

        if (
            active &&
            active !== document.body &&
            !container.contains(active)
        ) {
            return
        }

        opener.focus({ preventScroll: true })
    })
}

/**
 * The sheet motion and the drag, shared by the modal and the section sheets.
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
    const breakpoint = window.matchMedia(
        `not all and (min-width: ${options.until})`,
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sheet = {
        isActive: false,
        // The visible height of the sheet, in px.
        position: 0,
        breakpoint,
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

        // Wait for `x-show` (or the section) to show the sheet, so its height
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
    // resize across the breakpoint while it is open.
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
    sheet.modal = root

    const onBreakpointChange = () => {
        if (!sheet.breakpoint.matches) {
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

    sheet.breakpoint.addEventListener('change', onBreakpointChange)
    window.addEventListener('resize', onResize)

    if (sheet.breakpoint.matches) {
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
        Alpine.release(visibility)
        sheet.destroy()
        sheet.breakpoint.removeEventListener('change', onBreakpointChange)
        window.removeEventListener('resize', onResize)

        return { wasOpen: false }
    }
}

const createSectionSheet = (Alpine, el, isRestart = false) => {
    const id = el.dataset.bottomSheetId
    const section = () => el.querySelector(':scope > .fi-section')
    // The state of the focus trap. The directive keeps it, so the section
    // needs no `x-data`.
    const trap = Alpine.reactive({ isActive: false })
    const removeTrap = Alpine.bind(el, {
        'x-trap.noreturn.noautofocus': () => trap.isActive,
    })

    let isOpen = false
    let isLocked = false
    let opener = null

    const sheet = createSheet({
        host: el,
        sheet: section,
        content: () =>
            el.querySelector(
                ':scope > .fi-section > .fi-section-content-ctn > .fi-section-content',
            ),
        footerSelector: '.fi-section-footer',
        classes: SECTION_CLASSES,
        backClasses: SECTION_BACK_CLASSES,
        layers: () => [el],
        render: (height, offset) => {
            if (height !== null) {
                el.style.setProperty(
                    '--bottom-sheet-height',
                    height === 'auto' ? 'auto' : `${height}px`,
                )
            }

            el.style.setProperty(
                '--bottom-sheet-offset',
                typeof offset === 'number' ? `${offset}px` : offset,
            )
        },
        clear: () => {
            el.style.removeProperty('--bottom-sheet-height')
            el.style.removeProperty('--bottom-sheet-offset')
        },
        isShown: () => isOpen,
        requestClose: () => close(),
    })

    sheet.isOpen = () => isOpen

    const setLocked = (shouldLock) => {
        if (shouldLock !== isLocked) {
            isLocked = shouldLock
            shouldLock ? lockScroll() : unlockScroll()
        }
    }

    const setDialog = (isDialog) => {
        const heading = section()?.getAttribute('aria-labelledby')

        if (isDialog) {
            el.setAttribute('role', 'dialog')
            el.setAttribute('aria-modal', 'true')
            el.setAttribute('tabindex', '-1')

            if (heading) {
                el.setAttribute('aria-labelledby', heading)
            }

            return
        }

        for (const name of [
            'role',
            'aria-modal',
            'tabindex',
            'aria-labelledby',
        ]) {
            el.removeAttribute(name)
        }
    }

    // Hide the section until it opens again, and give the focus back to the
    // opening button.
    const hide = () => {
        isOpen = false
        trap.isActive = false
        setLocked(false)
        delete el.dataset.open
        el.classList.add('hidden')
        setDialog(false)
        removeSheet(sheet)

        if (opener) {
            restoreFocus(opener, el)
            opener = null
        }
    }

    const open = () => {
        if (!sheet.isActive || isOpen) {
            return
        }

        const active = document.activeElement

        opener = active && !el.contains(active) ? active : null
        isOpen = true
        setLocked(true)
        el.classList.remove('hidden')
        setDialog(true)
        pushSheet(sheet)
        sheet.open()

        requestAnimationFrame(() => {
            if (!isOpen) {
                return
            }

            el.dataset.open = ''
            trap.isActive = true
            Alpine.nextTick(() => isOpen && el.focus({ preventScroll: true }))
        })
    }

    const close = (velocity = 0) => {
        if (!sheet.isActive || !isOpen) {
            return
        }

        // The backdrop fades while the sheet moves down.
        delete el.dataset.open
        removeSheet(sheet)
        sheet.slideOut(velocity, hide)
    }

    const isForThisSheet = (event) => event.detail?.id === id

    const onOpen = (event) => isForThisSheet(event) && open()

    const onClose = (event) => isForThisSheet(event) && close()

    // A Filament modal that is not a sheet (for example at its own breakpoint)
    // closes with Escape first, as before.
    const hasOtherModal = () =>
        [...document.querySelectorAll('.fi-modal-open')].some(
            (modal) => !stack.some((other) => other.modal === modal),
        )

    sheet.onEscape = (event) => {
        if (!isOpen || hasOtherModal()) {
            return
        }

        event.stopImmediatePropagation()
        close()
    }

    // A tap on the backdrop, the root itself, closes the sheet.
    const onClick = (event) =>
        event.target === el && isOpen && isTopmostSheet(sheet) && close()

    const activate = () => {
        sheet.activate()
        el.classList.add('hidden')
    }

    const deactivate = () => {
        const wasOpen = isOpen

        isOpen = false
        opener = null
        trap.isActive = false
        setLocked(false)
        delete el.dataset.open
        el.classList.remove('hidden')
        setDialog(false)
        sheet.deactivate()

        // The section shows in its place again, and its root is no longer
        // a dialog that can have the focus.
        if (wasOpen && document.activeElement === el) {
            el.blur()
        }

        return wasOpen
    }

    const onBreakpointChange = () =>
        sheet.breakpoint.matches ? activate() : deactivate()

    const onResize = () =>
        sheet.isActive && isOpen && !sheet.isDragging() && sheet.place()

    window.addEventListener('open-bottom-sheet', onOpen)
    window.addEventListener('close-bottom-sheet', onClose)
    window.addEventListener('resize', onResize)
    el.addEventListener('click', onClick)
    sheet.breakpoint.addEventListener('change', onBreakpointChange)

    if (sheet.breakpoint.matches) {
        // `hidden` is set first, so the section stays hidden when the
        // first-paint class is removed.
        activate()

        // New options while the sheet is open: it stays open.
        if (isRestart) {
            open()
        }
    }

    el.classList.remove(...SECTION_CLOAK_CLASSES)

    return () => {
        const wasOpen = deactivate()

        sheet.destroy()
        removeTrap()
        window.removeEventListener('open-bottom-sheet', onOpen)
        window.removeEventListener('close-bottom-sheet', onClose)
        window.removeEventListener('resize', onResize)
        el.removeEventListener('click', onClick)
        sheet.breakpoint.removeEventListener('change', onBreakpointChange)

        return { wasOpen }
    }
}

// The attributes of `BottomSheet::attributes()` that the directive reads.
const OPTION_ATTRIBUTES = [
    'data-bottom-sheet-id',
    'data-bottom-sheet-until',
    'data-bottom-sheet-snap-points',
    'data-bottom-sheet-initial-height',
]

// The sheet state of the markup: null when the element is not a sheet.
const stateOf = (el, directive) =>
    el.hasAttribute(directive)
        ? OPTION_ATTRIBUTES.map((name) => el.getAttribute(name)).join('|')
        : null

// `wire:ignore.self` keeps the classes and styles of the directive, so a
// Livewire update does not change the attributes of the host. Before each
// update, the directive compares the new markup with its state: when the
// condition or an option changes, it starts again with the new state.
const onMorph = ({ el, toEl }) => el._bottomSheetSync?.(toEl)

const plugin = (Alpine) => {
    window.addEventListener('keydown', onEscape)

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
        Alpine.skipDuringClone((el, { modifiers }, { cleanup }) => {
            if (!el.isConnected) {
                return
            }

            const isSection = modifiers.includes('section')
            const directive = isSection
                ? 'x-bottom-sheet.section'
                : 'x-bottom-sheet'
            const create = isSection ? createSectionSheet : createModalSheet

            let state = stateOf(el, directive)
            let destroy = create(Alpine, el)

            el.__livewire_ignore_self = true

            el._bottomSheetSync = (toEl) => {
                const next = stateOf(toEl, directive)

                if (next === state) {
                    return
                }

                const { wasOpen } = destroy?.() ?? {}

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
                destroy = create(Alpine, el, isSection ? wasOpen : true)
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
