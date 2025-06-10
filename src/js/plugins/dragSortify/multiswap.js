const DROPLINE = {
  before: 'BEFORE',
  after: 'AFTER',
  class: {
    before: 'dropline-before',
    after: 'dropline-after'
  }
};

const DROPZONE_CLASSNAME = '.dropzone-bookmark';
const HOVER_CLASSNAME = 'dragover-hover';

export function multiswap(dnd) {
  const holdDelay = 500;

  let holdTimer = null;
  let draggingCards = [];
  let draggedElement = null;
  let activeDropZone = null;
  let lastTarget = null;
  let items = [];

  function hideDropLine(el) {
    el?.classList?.remove(DROPLINE.class.before, DROPLINE.class.after);
  }

  function activateDropZone(dropZone) {
    if (activeDropZone !== dropZone) {
      deactivateDropZone();
      dropZone.classList.add('has-highlight');
      activeDropZone = dropZone;
    }
  }

  function deactivateDropZone() {
    if (activeDropZone) {
      activeDropZone.classList.remove('has-highlight');
      activeDropZone = null;
    }
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  return {
    dragstart: (e) => {
      if (dnd.isDisabled) {
        return false;
      }

      draggedElement = e.target.closest(dnd.options.draggableSelector);
      if (!draggedElement) return;

      const dragStartCallback = dnd.options?.onDragStart?.({
        event: e,
        draggedElement,
        draggingItems: dnd.draggingItems.length ? dnd.draggingItems : [draggedElement]
      });

      if (dragStartCallback === false) {
        e.preventDefault();
        return;
      }

      items = Array.from(dnd.el.children);

      if (dnd.draggingItems.includes(draggedElement)) {
        draggingCards = [...dnd.draggingItems];
      } else {
        draggingCards = [draggedElement];
      }

      draggingCards.forEach((el) => dnd.toggleDragging(el, true));

      e.dataTransfer.effectAllowed = 'move';
    },
    dragover(e) {
      if (dnd.isIgnoreSelector(e.target)) {
        return;
      }

      e.preventDefault();

      const closestCard = e.target.closest(dnd.options.draggableSelector);
      const dropZone = e.target.closest(DROPZONE_CLASSNAME);

      if (activeDropZone) {
        hideDropLine(closestCard);
        return;
      }

      // nested zone activation timer
      if (dropZone && dropZone !== activeDropZone) {
        if (!holdTimer) {
          holdTimer = setTimeout(() => {
            activateDropZone(dropZone);
            hideDropLine(closestCard);
          }, holdDelay);
          return;
        }
      }

      // remove the highlight from the previous card, if there was one
      if (lastTarget && lastTarget !== closestCard) {
        hideDropLine(lastTarget);
        lastTarget.classList.remove(HOVER_CLASSNAME);
      }

      // if there is a target card and it is not draggable
      if (closestCard && closestCard !== draggedElement) {
        closestCard.classList.add(HOVER_CLASSNAME);

        const rect = closestCard.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / rect.width;

        // obtain the indices of the cards
        const draggedIndex = items.indexOf(draggedElement);
        const targetIndex = items.indexOf(closestCard);

        let isInvalidBefore = false;
        let isInvalidAfter = false;

        if (draggingCards.length > 1) {
          const leftIndex = items.indexOf(draggingCards.at(0));
          const rightIndex = items.indexOf(draggingCards.at(-1));

          if (draggingCards.includes(closestCard)) {
            return;
          }

          isInvalidBefore = targetIndex === leftIndex + draggingCards.length;
          isInvalidAfter = targetIndex === rightIndex - draggingCards.length;
        } else {
          // check if the order will change
          isInvalidBefore = targetIndex === draggedIndex + 1;
          isInvalidAfter = targetIndex === draggedIndex - 1;
        }

        let position = null;
        if (xRatio <= 0.5 && !isInvalidBefore) {
          position = DROPLINE.before;
        } else if (xRatio > 0.5 && !isInvalidAfter) {
          position = DROPLINE.after;
        }

        // apply the highlight
        if (position === DROPLINE.before) {
          closestCard.classList.remove(DROPLINE.class.after);
          closestCard.classList.add(DROPLINE.class.before);
        } else if (position === DROPLINE.after) {
          closestCard.classList.remove(DROPLINE.class.before);
          closestCard.classList.add(DROPLINE.class.after);
        } else {
          hideDropLine(closestCard);
        }

        lastTarget = closestCard;
      } else {
        if (lastTarget) {
          hideDropLine(lastTarget);
          lastTarget = null;
        }
      }
      dnd.options?.onDragOver?.(e);
    },
    drop(e) {
      e.preventDefault();

      if (dnd.isIgnoreSelector(e.target)) {
        return;
      }

      const closestCard = e.target.closest(dnd.options.draggableSelector);
      const dropZone = e.target.closest(DROPZONE_CLASSNAME);

      if (dropZone && dropZone === activeDropZone) {
        // inserting all cards into the dropZone
        draggingCards.forEach((card) => {
          const clone = card.cloneNode(true);
          dnd.options?.onAdd?.({
            item: card,
            target: dropZone,
            clone
          });
        });

        deactivateDropZone();
      } else if (closestCard && !draggingCards.includes(closestCard)) {
        const cardRect = closestCard.getBoundingClientRect();
        const insertBefore = e.clientX < cardRect.left + cardRect.width / 2;

        // remove all draggable cards from their current positions
        // draggingCards.forEach((item) => item.remove());

        // insert them into the new location
        if (insertBefore) {
          draggingCards.forEach((item) => dnd.el.insertBefore(item, closestCard));
        } else {
          const nextSibling = closestCard.nextSibling;
          draggingCards.forEach((item) => dnd.el.insertBefore(item, nextSibling));
        }

        dnd.options?.onUpdate?.(e);
        // if (dnd.options.viewTransition && document.startViewTransition) {
        //   const a = draggingCards.map(card => {
        //     return card;
        //   });
        //   document.startViewTransition(() => sort(a));
        // }
      }

      deactivateDropZone();

      dnd.options?.onDrop?.(e);
    },
    dragend(e) {
      draggingCards.forEach((el) => {
        dnd.toggleDragging(el, false);
        el.classList.remove(HOVER_CLASSNAME);
      });

      draggingCards = [];
      deactivateDropZone();

      if (lastTarget) {
        hideDropLine(lastTarget);
        lastTarget.classList.remove(HOVER_CLASSNAME);
      }
      lastTarget = null;

      dnd.options?.onDragEnd?.(e);
    },
    dragleave(e) {
      if (
        e.relatedTarget &&
        !e.relatedTarget.closest(DROPZONE_CLASSNAME)
      ) {
        deactivateDropZone();
        clearTimeout(holdTimer);
        holdTimer = null;
      }

      if (!dnd.el.contains(e.relatedTarget) && lastTarget) {
        hideDropLine(lastTarget);
        lastTarget.classList.remove(HOVER_CLASSNAME);
      }

      dnd.options?.onDragLeave?.(e);
    }
  };
}
