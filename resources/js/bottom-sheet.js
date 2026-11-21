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
 * trap, Escape, the outside tap and the nested modal stack (`modal.js`).
 * `data-bottom-sheet-overlay="false"` changes the sheet type only: no dark
 * layer. A tap outside the sheet still lands on the Filament window
 * container, so it closes the sheet and does not reach the page.
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
    // Near the top of the viewport, the sheet keeps its handle and header
    // below the top safe area. The core sets the gap above the sheet.
    'pt-[max(0px,calc(env(safe-area-inset-top)_-_var(--bottom-sheet-gap,100vh)))]',
    'will-change-transform',
    // The stack: the sheet under a new sheet moves back.
    'origin-bottom',
    'transition-[scale]',
    'duration-300',
    'motion-reduce:transition-none',
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

// The drag handle. It is the last child, so a morph of the server markup
// does not move the other children, and `order-first` shows it at the top.
const HANDLE_CLASSES = [
    'order-first',
    'flex',
    'shrink-0',
    'justify-center',
    'pt-2',
    'touch-none',
    'select-none',
    'rounded-t-2xl',
    'outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-inset',
    'focus-visible:ring-primary-500',
    'before:block',
    'before:h-1.5',
    'before:w-10',
    'before:rounded-full',
    'before:bg-gray-300',
    'dark:before:bg-gray-600',
]

const HANDLE_SELECTOR = ':scope > [data-bottom-sheet-handle]'

// The Filament classes a slide-over can set on the modal root
// (`components/modal/index.blade.php`). The directive adds each sticky class
// only when its data attribute is true.
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

// The input types that do not open a keyboard.
const NOT_TEXT_INPUTS = [
    'checkbox',
    'radio',
    'range',
    'button',
    'submit',
    'reset',
    'file',
    'color',
    'hidden',
]

const isTextField = (node) =>
    node instanceof HTMLTextAreaElement ||
    !!node?.isContentEditable ||
    (node instanceof HTMLInputElement && !NOT_TEXT_INPUTS.includes(node.type))

// The visible viewport: its height, and the height of the part of the layout
// viewport under it (the keyboard). With no visual viewport, or a pinch
// zoom, it is the layout viewport.
const readViewport = () => {
    const visual = window.visualViewport

    if (!visual || Math.abs(visual.scale - 1) > 0.01) {
        return { height: window.innerHeight, bottom: 0 }
    }

    return {
        height: visual.height,
        bottom: Math.max(
            0,
            window.innerHeight - visual.height - visual.offsetTop,
        ),
    }
}

// Call `callback` at each change of the visible viewport. Give the function
// that removes the listeners.
const watchViewport = (callback) => {
    const targets = [window.visualViewport, window].filter(Boolean)

    targets.forEach((target) => target.addEventListener('resize', callback))
    window.visualViewport?.addEventListener('scroll', callback)

    return () => {
        targets.forEach((target) =>
            target.removeEventListener('resize', callback),
        )
        window.visualViewport?.removeEventListener('scroll', callback)
    }
}

// The open sheets, from the lowest to the topmost. Each sheet under the
// topmost one moves back, as the iOS sheets do.
const stack = []

// The topmost sheet keeps the `z-40` of its classes (a Filament modal also has
// `z-40`). Each sheet under it gets a lower layer, so the sheet that opened
// last is on top, whatever its place in the DOM. The layers have a step of 2:
// the outside hit area of a sheet is one layer below the sheet, and above
// the sheet under it.
const TOP_LAYER = 40

const LOWEST_LAYER = 31

const updateStack = () =>
    stack.forEach((sheet, index) => {
        const depth = stack.length - 1 - index

        sheet.moveBack(depth > 0)
        sheet.setLayer(depth && Math.max(TOP_LAYER - 2 * depth, LOWEST_LAYER))
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
    snapPoints: JSON.parse(
        el.dataset.bottomSheetSnapPoints || '[0.25,0.5,0.75,1]',
    ),
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
 * - `render(height, offset, frame)` and `clear()`, for the sheet frame
 *   (`frame` gives `bottom`, the keyboard height, and `gap`, the space above
 *   the sheet, in px);
 * - `handleLabel()`: the accessible name of a handle that the core adds;
 * - `layers()`: the elements that get the stack layer (`z-index`);
 * - `isShown()`: the sheet element is shown;
 * - `requestClose()`: close the part, as the user asks for it.
 *
 * `sheet.reason` is the cause of the last motion: `drag`, `snap`,
 * `escape` (the handle key), `focus` (a text field), or a value that the
 * part sets.
 */
const createSheet = (part) => {
    const { host } = part
    const options = readOptions(host)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sheet = {
        isActive: false,
        // The visible height of the sheet, in px.
        position: 0,
        reason: null,
    }

    // The heights where the sheet can rest, in px, from low to high: the snap
    // points only. The first height of an open is free.
    let rests = []
    let initial = 0
    // True from an open until the first drag: a viewport change keeps the
    // first height, not the nearest snap point.
    let isAtInitial = true
    // The viewport height of the last measure.
    let measuredHeight = 0
    let frame = null
    // The height that the spring moves to, while it moves.
    let springTarget = null
    let drag = null

    const viewportHeight = () => readViewport().height

    const lowest = () => rests[0] ?? 0

    const highest = () => rests[rests.length - 1] ?? viewportHeight()

    // The lowest frame height: below it, the frame moves down.
    const floor = () => Math.min(lowest(), initial || lowest())

    const render = () => {
        const viewport = readViewport()
        const height = Math.min(
            Math.max(sheet.position, floor()),
            viewport.height,
        )
        const offset = Math.max(0, floor() - sheet.position)

        part.render(height, offset, {
            bottom: viewport.bottom,
            gap: Math.max(0, viewport.height - sheet.position),
        })
    }

    const measureRests = () => {
        const height = viewportHeight()

        measuredHeight = height

        if (options.initialHeight === 'content') {
            part.render('auto', 0, { bottom: readViewport().bottom, gap: null })

            const contentHeight = part.sheet()?.getBoundingClientRect().height

            initial = Math.min(
                contentHeight > 0 ? contentHeight : FALLBACK_HEIGHT * height,
                height,
            )
        } else {
            initial = Math.min(options.initialHeight * height, height)
        }

        initial = Math.round(initial)
        rests = [
            ...new Set(
                options.snapPoints.map((point) => Math.round(point * height)),
            ),
        ].sort((a, b) => a - b)

        return initial
    }

    const stop = () => {
        if (frame) {
            cancelAnimationFrame(frame)
            frame = null
        }

        springTarget = null
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

        springTarget = target

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
                springTarget = null
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
        isAtInitial = true
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

            isAtInitial = true
            measureRests()

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

    // Put the sheet at its height with no animation, for example after a
    // resize to the sheet type while it is open. Before the first drag, it is
    // the first height. After it, it is the snap point of the same part of
    // the viewport.
    sheet.place = () => {
        // A spring keeps its target: the keyboard can open while the sheet
        // moves to its highest snap point.
        const from = springTarget > 0 ? springTarget : sheet.position

        stop()

        const ratio = from / (measuredHeight || 1)

        measureRests()

        sheet.position =
            from && !isAtInitial ? nearest(ratio * viewportHeight()) : initial
        render()
    }

    // A change of the visible viewport (the keyboard, a scroll of the
    // visual viewport, a rotation).
    sheet.fit = () =>
        Math.abs(viewportHeight() - measuredHeight) > 0.5
            ? sheet.place()
            : render()

    const settle = (velocity) => {
        const isFlick = Math.abs(velocity) > FLICK_VELOCITY

        isAtInitial = false
        sheet.reason = 'snap'

        if (sheet.position < floor() * (1 - DISMISS_DISTANCE)) {
            sheet.reason = 'drag'
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
            sheet.reason = 'drag'
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
        // A first height above the highest snap point is not pulled down.
        const top = Math.max(highest(), drag.startPosition)

        if (next > top) {
            next = top + (next - top) * RUBBER_BAND
        }

        sheet.position = next
        sheet.reason = 'drag'
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

    // The handle: the one of the part, or one that the directive adds. It is
    // focusable, and Enter or Space closes the sheet.
    let addedHandle = null

    const ensureHandle = () => {
        const target = part.sheet()

        if (!target || target.querySelector(HANDLE_SELECTOR)) {
            return
        }

        addedHandle ??= Object.assign(document.createElement('div'), {
            tabIndex: 0,
            className: HANDLE_CLASSES.join(' '),
        })
        addedHandle.setAttribute('data-bottom-sheet-handle', '')
        addedHandle.setAttribute('role', 'button')
        addedHandle.setAttribute('aria-label', part.handleLabel())
        target.append(addedHandle)
    }

    // A morph of the server markup removes the added handle: add it again.
    const handleObserver = new MutationObserver(
        () => sheet.isActive && addedHandle && ensureHandle(),
    )

    const onKeyDown = (event) => {
        if (
            (event.key !== 'Enter' && event.key !== ' ') ||
            !event.target.closest?.('[data-bottom-sheet-handle]') ||
            !sheet.isActive ||
            !sheet.isOpen() ||
            !isTopmostSheet(sheet)
        ) {
            return
        }

        event.preventDefault()
        sheet.reason = 'escape'
        dismiss()
    }

    // A focus on a text field moves the top sheet to its highest snap point,
    // above the keyboard. Not in a drag, not in the open motion (the
    // Filament autofocus), and not when the sheet slides out.
    const onFocusIn = (event) => {
        if (
            !isTextField(event.target) ||
            !sheet.isActive ||
            !sheet.isOpen() ||
            !isTopmostSheet(sheet) ||
            drag ||
            (frame && isAtInitial) ||
            !rests.length ||
            springTarget < 0 ||
            !part.sheet()?.contains(event.target) ||
            (springTarget ?? sheet.position) >= highest() - 1
        ) {
            return
        }

        isAtInitial = false
        sheet.reason = 'focus'
        springTo(highest())
    }

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
        ensureHandle()

        const target = part.sheet()

        if (addedHandle && target) {
            handleObserver.observe(target, { childList: true })
        }
    }

    sheet.deactivate = () => {
        sheet.isActive = false
        sheet.halt()
        removeSheet(sheet)
        handleObserver.disconnect()
        addedHandle?.remove()
        host.classList.remove(...part.classes, ...part.backClasses)
        part.clear()
    }

    host.addEventListener('touchstart', onTouchStart, { passive: true })
    host.addEventListener('touchmove', onTouchMove, { passive: false })
    host.addEventListener('touchend', endDrag)
    host.addEventListener('touchcancel', endDrag)
    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('keydown', onKeyDown)
    host.addEventListener('focusin', onFocusIn)

    sheet.destroy = () => {
        sheet.deactivate()
        host.removeEventListener('touchstart', onTouchStart)
        host.removeEventListener('touchmove', onTouchMove)
        host.removeEventListener('touchend', endDrag)
        host.removeEventListener('touchcancel', endDrag)
        host.removeEventListener('pointerdown', onPointerDown)
        host.removeEventListener('keydown', onKeyDown)
        host.removeEventListener('focusin', onFocusIn)
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
        // The label of the Filament close button, in the app language.
        handleLabel: () =>
            el
                .querySelector(':scope > .fi-modal-header .fi-modal-close-btn')
                ?.getAttribute('aria-label') || 'Close',
        render: (height, offset, frame) => {
            if (height !== null) {
                el.style.height = height === 'auto' ? 'auto' : `${height}px`
            }

            if (frame) {
                el.style.bottom = frame.bottom ? `${frame.bottom}px` : ''
                frame.gap === null
                    ? el.style.removeProperty('--bottom-sheet-gap')
                    : el.style.setProperty(
                          '--bottom-sheet-gap',
                          `${frame.gap}px`,
                      )
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
            el.style.removeProperty('bottom')
            el.style.removeProperty('--bottom-sheet-gap')
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

    // Only the top sheet takes an outside tap and traps the focus. Under a
    // newer sheet, the dark layer and the window container let a tap through
    // (the window still takes it), and the Filament focus trap stops until
    // the sheet is on top again.
    let isTrapHeld = false
    const setLayer = sheet.setLayer

    sheet.setLayer = (layer) => {
        setLayer(layer)

        const isUnder = !!layer && sheet.isActive

        root.querySelectorAll(
            ':scope > .fi-modal-close-overlay, :scope > .fi-modal-window-ctn',
        ).forEach((node) => {
            node.style.pointerEvents = isUnder ? 'none' : ''
        })

        el.style.pointerEvents = isUnder ? 'auto' : ''

        if (isUnder && modal.isTrapActive) {
            isTrapHeld = true
            modal.isTrapActive = false
        } else if (!isUnder && isTrapHeld) {
            isTrapHeld = false
            modal.isTrapActive = modal.isOpen
        }
    }

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
        'fi-modal-slide-over',
        ...(el.dataset.bottomSheetSlideOverStickyHeader === 'true'
            ? ['fi-modal-has-sticky-header']
            : []),
        ...(el.dataset.bottomSheetSlideOverStickyFooter === 'true'
            ? ['fi-modal-has-sticky-footer']
            : []),
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

        applyOverlay()
    })

    // `x-show` sets an inline display on the overlay. An important inline
    // value hides it, and this observer puts that value back when `x-show`
    // writes the style again. It watches the overlay only, not the window:
    // the window style changes on every drag frame.
    let overlayNode = null
    const overlayObserver = new MutationObserver(() => applyOverlay())

    const hidesOverlay = () =>
        type === 'sheet' && el.dataset.bottomSheetOverlay === 'false'

    // Only the dark layer goes. The Filament window container stays under the
    // sheet: it takes the outside tap (`x-on:click.self`), and Filament keeps
    // the page scroll lock.
    const applyOverlay = () => {
        const hide = hidesOverlay()
        const overlay = root.querySelector(':scope > .fi-modal-close-overlay')

        if (overlay) {
            const isHidden =
                overlay.style.display === 'none' &&
                overlay.style.getPropertyPriority('display') === 'important'

            if (hide && !isHidden) {
                overlay.style.setProperty('display', 'none', 'important')
            } else if (
                !hide &&
                overlay.style.getPropertyPriority('display') === 'important'
            ) {
                overlay.style.removeProperty('display')
            }
        }

        if (overlay !== overlayNode) {
            overlayObserver.disconnect()
            overlayNode = overlay

            if (overlay) {
                overlayObserver.observe(overlay, {
                    attributes: true,
                    attributeFilter: ['style'],
                })
            }
        }
    }

    const onTypeChange = () => {
        const next = currentType()

        if (next === type) {
            return
        }

        type = next
        applyType(root)
        applyOverlay()

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

    const onViewportChange = () =>
        sheet.isActive &&
        modal.isWindowVisible &&
        !sheet.isDragging() &&
        sheet.fit()

    types.forEach(({ query }) =>
        query.addEventListener('change', onTypeChange),
    )
    const unwatchViewport = watchViewport(onViewportChange)

    type = currentType()
    applyType(root)
    applyOverlay()
    observer.observe(root, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
    })

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
        unwatchViewport()

        // The root gets its server classes again, and the overlay its
        // Filament behaviour.
        observer.disconnect()
        overlayObserver.disconnect()
        type = null
        applyType(root)
        applyOverlay()

        return { index }
    }
}

// The element sheet (`x-bottom-sheet:element`): the same frame as the action
// sheet, with the theme surface and no ring.
const ELEMENT_CLASSES = [
    'fi-bottom-sheet',
    'fixed',
    'inset-x-0',
    'bottom-0',
    'top-auto',
    'z-40',
    'm-0',
    'w-full',
    'max-w-none',
    'max-h-dvh',
    'flex',
    'flex-col',
    'overflow-hidden',
    'overscroll-contain',
    'rounded-t-2xl',
    'rounded-b-none',
    'bg-white',
    'shadow-xl',
    'dark:bg-gray-900',
    'pb-[env(safe-area-inset-bottom)]',
    'pt-[max(0px,calc(env(safe-area-inset-top)_-_var(--bottom-sheet-gap,100vh)))]',
    'will-change-transform',
    'origin-bottom',
    'transition-[scale]',
    'duration-300',
    'motion-reduce:transition-none',
    // The body scrolls. The footer stays at the bottom.
    '[&_[data-bottom-sheet-content]]:min-h-0',
    '[&_[data-bottom-sheet-content]]:flex-1',
    '[&_[data-bottom-sheet-content]]:overflow-y-auto',
    '[&_[data-bottom-sheet-content]]:overscroll-contain',
    '[&_[data-bottom-sheet-footer]]:shrink-0',
]

// The outside hit area of an element sheet. It takes the outside tap, so the
// tap does not reach the page, and a scroll on it does not move the page.
const BACKDROP_CLASSES = [
    'fixed',
    'inset-0',
    'touch-none',
    'transition-[opacity,visibility]',
    'duration-300',
    'motion-reduce:transition-none',
]

const BACKDROP_DARK_CLASSES = ['bg-gray-950/50', 'dark:bg-gray-950/75']

const BACKDROP_HIDDEN_CLASSES = [
    'invisible',
    'opacity-0',
    'pointer-events-none',
]

const createElementSheet = (
    Alpine,
    el,
    { isEnabled = true, isOpen: wasOpen = false, isRestart = false } = {},
) => {
    const id = el.dataset.bottomSheetId
    // `overlay`: the dark layer; `close`: no dark layer, an outside tap
    // closes; `pass`: an outside tap reaches the page.
    const outside =
        el.dataset.bottomSheetOutside === 'pass'
            ? 'pass'
            : el.dataset.bottomSheetOverlay === 'false'
              ? 'close'
              : 'overlay'
    // `isUnder`: a newer sheet is on top, so the trap stops until this sheet
    // is on top again.
    const trap = Alpine.reactive({ isActive: false, isUnder: false })

    let isOpen = false
    let opener = null
    let lastHeight = null
    let backdrop = null
    let releaseTrap = null

    const emit = (name, height) =>
        el.dispatchEvent(
            new CustomEvent(`bottom-sheet:${name}`, {
                bubbles: true,
                detail: { id, height, reason: sheet.reason },
            }),
        )

    // The visible height: the CSS variable and the resize event.
    const report = (height) => {
        const value = Math.max(0, Math.round(height))

        el.style.setProperty('--bottom-sheet-height', `${value}px`)

        if (value !== lastHeight) {
            lastHeight = value
            emit('resize', value)
        }
    }

    const sheet = createSheet({
        host: el,
        sheet: () => el,
        content: () => el.querySelector('[data-bottom-sheet-content]'),
        footerSelector: '[data-bottom-sheet-footer]',
        classes: ELEMENT_CLASSES,
        backClasses: MODAL_BACK_CLASSES,
        layers: () => [el],
        handleLabel: () => 'Close',
        render: (height, offset, frame) => {
            if (height !== null) {
                el.style.height = height === 'auto' ? 'auto' : `${height}px`
            }

            if (frame) {
                el.style.bottom = frame.bottom ? `${frame.bottom}px` : ''
                frame.gap === null
                    ? el.style.removeProperty('--bottom-sheet-gap')
                    : el.style.setProperty(
                          '--bottom-sheet-gap',
                          `${frame.gap}px`,
                      )
            }

            el.style.transform =
                offset === '100%'
                    ? 'translate3d(0, 100%, 0)'
                    : offset
                      ? `translate3d(0, ${offset}px, 0)`
                      : ''

            if (offset === '100%') {
                report(0)
            } else if (typeof height === 'number') {
                report(height - offset)
            }
        },
        clear: () => {
            for (const name of [
                'height',
                'transform',
                'bottom',
                'visibility',
                '--bottom-sheet-gap',
                '--bottom-sheet-height',
            ]) {
                el.style.removeProperty(name)
            }

            lastHeight = null
        },
        isShown: () => isOpen,
        requestClose: () => finishClose(),
    })

    sheet.isOpen = () => isOpen

    // The outside hit area is under the sheet: one layer below it. Only the
    // top sheet takes an outside tap and traps the focus.
    const setLayer = sheet.setLayer

    sheet.setLayer = (layer) => {
        setLayer(layer)

        const isUnder = !!layer && sheet.isActive

        trap.isUnder = isUnder

        if (backdrop) {
            backdrop.style.zIndex = `${(isUnder ? layer : TOP_LAYER) - 1}`
            backdrop.style.pointerEvents = isUnder ? 'none' : ''
        }
    }

    const toggleBackdrop = (isShown) =>
        BACKDROP_HIDDEN_CLASSES.forEach((name) =>
            backdrop?.classList.toggle(name, !isShown),
        )

    const preventScroll = (event) => event.cancelable && event.preventDefault()

    const onOutside = () => isTopmostSheet(sheet) && close('outside')

    const addBackdrop = () => {
        if (outside === 'pass' || backdrop) {
            return
        }

        backdrop = document.createElement('div')
        backdrop.className = [
            ...BACKDROP_CLASSES,
            ...(outside === 'overlay' ? BACKDROP_DARK_CLASSES : []),
            ...BACKDROP_HIDDEN_CLASSES,
        ].join(' ')
        backdrop.setAttribute('aria-hidden', 'true')
        backdrop.style.zIndex = `${TOP_LAYER - 1}`
        backdrop.addEventListener('click', onOutside)
        backdrop.addEventListener('wheel', preventScroll, { passive: false })
        backdrop.addEventListener('touchmove', preventScroll, {
            passive: false,
        })
        // In the body, so a Livewire morph of the page does not remove it.
        document.body.append(backdrop)
    }

    const removeBackdrop = () => {
        backdrop?.remove()
        backdrop = null
    }

    // The focus stays inside the sheet: the Alpine `x-trap` of Filament
    // modals, with no autofocus (no keyboard on a phone) and no return
    // (the sheet gives the focus back itself).
    const startTrap = () => {
        if (outside === 'pass') {
            return
        }

        releaseTrap ??= Alpine.bind(el, {
            'x-trap.noautofocus.noreturn': () =>
                trap.isActive && !trap.isUnder,
        })
        trap.isActive = true
        el.querySelector('[data-bottom-sheet-handle]')?.focus({
            preventScroll: true,
        })
    }

    const stopTrap = () => {
        if (!trap.isActive) {
            return
        }

        trap.isActive = false

        // The focus goes back to the opener, unless the user moved it.
        const focused = document.activeElement

        if (
            opener?.isConnected &&
            (el.contains(focused) || focused === document.body)
        ) {
            opener.focus({ preventScroll: true })
        }

        opener = null
    }

    const show = () => {
        el.style.removeProperty('visibility')
        toggleBackdrop(true)
        pushSheet(sheet)
    }

    const hide = () => {
        el.style.visibility = 'hidden'
        toggleBackdrop(false)
    }

    const open = (reason) => {
        if (isOpen) {
            return
        }

        isOpen = true
        sheet.reason = reason

        if (!sheet.isActive) {
            return
        }

        opener = document.activeElement
        show()
        emit('opened', 0)
        sheet.open()
        startTrap()
    }

    const finishClose = () => {
        if (!isOpen) {
            return
        }

        isOpen = false
        sheet.halt()
        removeSheet(sheet)
        hide()
        report(0)
        emit('closed', 0)
        stopTrap()
    }

    const close = (reason) => {
        if (!isOpen) {
            return
        }

        sheet.reason = reason

        if (!sheet.isActive) {
            isOpen = false

            return
        }

        toggleBackdrop(false)
        sheet.slideOut(0, finishClose)
    }

    // The condition of `x-bottom-sheet:element="condition"`. Off, the element
    // gets its own styles again; an open sheet comes back open.
    const setEnabled = (isOn) => {
        if (isOn === sheet.isActive) {
            return
        }

        if (!isOn) {
            stopTrap()
            removeBackdrop()
            sheet.deactivate()

            return
        }

        sheet.activate()
        addBackdrop()

        if (!isOpen) {
            hide()
            report(0)

            return
        }

        show()
        sheet.reason = 'viewport'
        sheet.place()
        startTrap()
    }

    const onOpenEvent = (event) => event.detail?.id === id && open('event')

    const onCloseEvent = (event) => event.detail?.id === id && close('event')

    // Only the top sheet takes Escape: the capture phase stops it before the
    // Filament modal under the sheet gets it.
    const onKeyDown = (event) => {
        if (
            event.key !== 'Escape' ||
            !isOpen ||
            !sheet.isActive ||
            !isTopmostSheet(sheet)
        ) {
            return
        }

        event.stopPropagation()
        close('escape')
    }

    const onViewportChange = () => {
        if (!sheet.isActive || !isOpen || sheet.isDragging()) {
            return
        }

        sheet.reason = 'viewport'
        sheet.fit()
    }

    window.addEventListener('bottom-sheet:open', onOpenEvent)
    window.addEventListener('bottom-sheet:close', onCloseEvent)
    window.addEventListener('keydown', onKeyDown, true)
    const unwatchViewport = watchViewport(onViewportChange)

    // New options while the sheet is open: it stays open, with no new open
    // animation.
    isOpen = isRestart && wasOpen
    setEnabled(isEnabled)

    const destroy = () => {
        const index = stack.indexOf(sheet)
        const wasShown = isOpen

        window.removeEventListener('bottom-sheet:open', onOpenEvent)
        window.removeEventListener('bottom-sheet:close', onCloseEvent)
        window.removeEventListener('keydown', onKeyDown, true)
        unwatchViewport()
        stopTrap()
        releaseTrap?.()
        releaseTrap = null
        removeBackdrop()
        sheet.destroy()

        return { index, isOpen: wasShown }
    }

    destroy.setEnabled = setEnabled

    return destroy
}

// The attributes of `BottomSheet::attributes()` that the directive reads.
const OPTION_ATTRIBUTES = [
    'data-bottom-sheet-modal-from',
    'data-bottom-sheet-slide-over-from',
    'data-bottom-sheet-slide-over-position',
    'data-bottom-sheet-slide-over-sticky-header',
    'data-bottom-sheet-slide-over-sticky-footer',
    'data-bottom-sheet-snap-points',
    'data-bottom-sheet-initial-height',
    'data-bottom-sheet-overlay',
    // The element sheet only.
    'data-bottom-sheet-id',
    'data-bottom-sheet-outside',
]

// The sheet state of the markup: null when the element is not a sheet.
const stateOf = (el, directive) =>
    el.hasAttribute(directive)
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
        Alpine.skipDuringClone(
            (el, { value, expression }, { cleanup, effect, evaluateLater }) => {
                if (!el.isConnected) {
                    return
                }

                const isElement = value === 'element'
                const directive = isElement
                    ? 'x-bottom-sheet:element'
                    : 'x-bottom-sheet'
                // The condition of the element sheet: off while it is false.
                const condition =
                    isElement && expression ? evaluateLater(expression) : null
                let isEnabled = !condition

                const create = (isRestart = false, isOpen = false) =>
                    isElement
                        ? createElementSheet(Alpine, el, {
                              isEnabled,
                              isOpen,
                              isRestart,
                          })
                        : createModalSheet(Alpine, el, isRestart)

                let state = stateOf(el, directive)
                let destroy = create()

                el.__livewire_ignore_self = true

                el._bottomSheetSync = (toEl) => {
                    const next = stateOf(toEl, directive)

                    if (next === state) {
                        return
                    }

                    const { index = -1, isOpen = false } = destroy?.() ?? {}

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
                    destroy = create(true, isOpen)
                    restartIndex = null
                }

                if (condition) {
                    effect(() =>
                        condition((isOn) => {
                            isEnabled = !!isOn
                            destroy?.setEnabled?.(isEnabled)
                        }),
                    )
                }

                cleanup(() => {
                    destroy?.()
                    destroy = null
                    delete el._bottomSheetSync
                })
            },
        ),
    )
}

if (window.Alpine) {
    window.Alpine.plugin(plugin)
} else {
    document.addEventListener('alpine:init', () => window.Alpine.plugin(plugin))
}
