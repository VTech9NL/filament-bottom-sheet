/**
 * The `x-bottom-sheet` Alpine directive.
 *
 * Below the breakpoint, it turns a Filament modal window into a native bottom
 * sheet. At and above the breakpoint, it does nothing. Filament keeps the
 * modal itself: open and close, the scroll lock, the focus trap, Escape, the
 * backdrop tap and the nested modal stack (`modal.js`).
 */

// The classes are literal strings, so the Tailwind build of the panel theme
// finds them with `@source`. The window has `wire:ignore.self`, so a Livewire
// update keeps them.
const SHEET_CLASSES = [
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

const readOptions = (el) => ({
    until: el.dataset.bottomSheetUntil || '48rem',
    snapPoints: JSON.parse(el.dataset.bottomSheetSnapPoints || '[0.5,0.8,1]'),
    initialHeight:
        el.dataset.bottomSheetInitialHeight === 'content'
            ? 'content'
            : parseFloat(el.dataset.bottomSheetInitialHeight) ||
              FALLBACK_HEIGHT,
})

const createModalSheet = (Alpine, el, { effect, cleanup }) => {
    const root = el.closest('.fi-modal')

    if (!root) {
        return
    }

    const modal = Alpine.$data(el)
    const options = readOptions(el)
    const breakpoint = window.matchMedia(
        `not all and (min-width: ${options.until})`,
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let isActive = false
    // The visible height of the sheet, in px.
    let position = 0
    // The heights where the sheet can rest, in px, from low to high.
    let rests = []
    let frame = null
    let drag = null

    const content = () => el.querySelector(':scope > .fi-modal-content')

    const viewportHeight = () => window.innerHeight

    const lowest = () => rests[0] ?? 0

    const highest = () => rests[rests.length - 1] ?? viewportHeight()

    const render = () => {
        const height = Math.min(
            Math.max(position, lowest()),
            viewportHeight(),
        )
        const offset = Math.max(0, lowest() - position)

        el.style.height = `${height}px`
        el.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : ''
    }

    const measureRests = () => {
        const height = viewportHeight()
        const snaps = options.snapPoints.map((point) => point * height)
        const max = Math.max(...snaps)

        let initial

        if (options.initialHeight === 'content') {
            el.style.height = 'auto'

            const contentHeight = el.getBoundingClientRect().height

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
            position = target
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
                    -SPRING_STIFFNESS * (position - target) - damping * speed

                speed += acceleration * dt
                position += speed * dt
            }

            if (
                Math.abs(position - target) < 0.5 &&
                Math.abs(speed) < 10
            ) {
                position = target
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

    const close = () => {
        if (root.id) {
            window.dispatchEvent(
                new CustomEvent('close-modal', { detail: { id: root.id } }),
            )

            return
        }

        root.dispatchEvent(new CustomEvent('close-modal'))
    }

    const dismiss = (velocity = 0) => {
        // Below 0, so the shadow also leaves the screen.
        springTo(-24, Math.min(velocity, 0), close)
    }

    const isVisible = () => el.getClientRects().length > 0

    const open = () => {
        stop()
        el.style.transform = 'translate3d(0, 100%, 0)'

        // Wait for `x-show` to show the window, so its height can be measured.
        let tries = 0

        const start = () => {
            if (!isActive || !modal.isWindowVisible) {
                return
            }

            if (!isVisible() && tries++ < 10) {
                frame = requestAnimationFrame(start)

                return
            }

            const initial = measureRests()

            position = 0
            render()
            springTo(initial)
        }

        frame = requestAnimationFrame(start)
    }

    // Put the sheet at a rest point with no animation, for example after a
    // resize across the breakpoint while it is open.
    const place = () => {
        stop()

        const ratio = position / (highest() || 1)
        const initial = measureRests()

        position = position
            ? nearest(ratio * highest())
            : initial
        render()
    }

    const nearest = (value) =>
        rests.reduce((best, rest) =>
            Math.abs(rest - value) < Math.abs(best - value) ? rest : best,
        )

    const settle = (velocity) => {
        const isFlick = Math.abs(velocity) > FLICK_VELOCITY

        if (position < lowest() * (1 - DISMISS_DISTANCE)) {
            dismiss(velocity)

            return
        }

        if (!isFlick) {
            springTo(nearest(position), velocity)

            return
        }

        if (velocity > 0) {
            springTo(
                rests.find((rest) => rest > position + 1) ?? highest(),
                velocity,
            )

            return
        }

        const below = rests.filter((rest) => rest < position - 1)

        if (!below.length) {
            dismiss(velocity)

            return
        }

        springTo(below[below.length - 1], velocity)
    }

    // True when the body, or a scroll area in it under the pointer, is not at
    // the top of its scroll.
    const isScrolled = (target) => {
        const body = content()

        for (let node = target; node && node !== el; node = node.parentElement) {
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
        if (!isActive || !modal.isOpen || !target) {
            return
        }

        const body = content()
        const isInBody = !!body?.contains(target)
        const isInFooter = !!target.closest('.fi-modal-footer')

        if (isInFooter || (!isInBody && target.closest(NOT_DRAGGABLE))) {
            return
        }

        // A mouse does not drag the body: a wheel scrolls it.
        if (isInBody && !isTouch) {
            return
        }

        drag = {
            startY: y,
            startPosition: position,
            mode: isInBody ? 'pending' : 'sheet',
            target,
            samples: [{ time: performance.now(), y }],
        }

        if (drag.mode === 'sheet') {
            stop()
        }
    }

    const moveDrag = (y, event) => {
        if (!drag || drag.mode === 'scroll') {
            return
        }

        if (drag.mode === 'pending') {
            if (y === drag.startY) {
                return
            }

            const isDown = y > drag.startY
            const canMoveUp = position < highest() - 1

            if ((isDown && !isScrolled(drag.target)) || (!isDown && canMoveUp)) {
                drag.mode = 'sheet'
                drag.startY = y
                drag.startPosition = position
                stop()
            } else {
                drag.mode = 'scroll'

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

        position = next
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

    const onPointerMove = (event) => moveDrag(event.clientY, event)

    const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        endDrag()
    }

    const activate = () => {
        isActive = true
        el.classList.add(...SHEET_CLASSES)

        if (modal.isWindowVisible) {
            place()
        }
    }

    const deactivate = () => {
        isActive = false
        stop()
        drag = null
        el.classList.remove(...SHEET_CLASSES)
        el.style.removeProperty('height')
        el.style.removeProperty('transform')
    }

    const onBreakpointChange = () =>
        breakpoint.matches ? activate() : deactivate()

    const onResize = () => isActive && modal.isWindowVisible && !drag && place()

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', endDrag)
    el.addEventListener('touchcancel', endDrag)
    el.addEventListener('pointerdown', onPointerDown)
    breakpoint.addEventListener('change', onBreakpointChange)
    window.addEventListener('resize', onResize)

    if (breakpoint.matches) {
        activate()
    }

    effect(() => {
        if (!modal.isWindowVisible) {
            // Filament closes the modal: the leave transition in
            // `bottom-sheet.css` moves the sheet down.
            stop()
            drag = null

            return
        }

        if (isActive) {
            open()
        }
    })

    cleanup(() => {
        deactivate()
        el.removeEventListener('touchstart', onTouchStart)
        el.removeEventListener('touchmove', onTouchMove)
        el.removeEventListener('touchend', endDrag)
        el.removeEventListener('touchcancel', endDrag)
        el.removeEventListener('pointerdown', onPointerDown)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        breakpoint.removeEventListener('change', onBreakpointChange)
        window.removeEventListener('resize', onResize)
    })
}

const plugin = (Alpine) => {
    Alpine.directive('bottom-sheet', (el, { modifiers }, utilities) => {
        // The section sheet comes in a later version of this file.
        if (modifiers.includes('section')) {
            return
        }

        createModalSheet(Alpine, el, utilities)
    })
}

if (window.Alpine) {
    window.Alpine.plugin(plugin)
} else {
    document.addEventListener('alpine:init', () => window.Alpine.plugin(plugin))
}
