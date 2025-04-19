const DROPLINE = {
  before: 'BEFORE',
  after: 'AFTER',
  class: {
    before: 'dropline-before',
    after: 'dropline-after'
  }
};

export function multiswap(dnd) {
  const holdDelay = 800;

  let holdTimer = null;
  let draggingCards = [];
  let draggedElement = null;
  let activeDropZone = null;
  let lastTarget = null;
  let items = [];

  function hideDropLine(el) {
    el.classList.remove(DROPLINE.class.before, DROPLINE.class.after);
  }

  function activateDropZone(dropZone) {
    if (activeDropZone !== dropZone) {
      deactivateDropZone();
      dropZone.classList.add('active');
      activeDropZone = dropZone;
    }
  }

  function deactivateDropZone() {
    if (activeDropZone) {
      activeDropZone.classList.remove('active');
      activeDropZone = null;
    }
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  function animateCardIntoDropZone(card, dropZone) {
    const dropZoneRect = dropZone.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const translateX = dropZoneRect.left + dropZoneRect.width / 2 - cardRect.left - cardRect.width / 2;
    const translateY = dropZoneRect.top + dropZoneRect.height / 2 - cardRect.top - cardRect.height / 2;
    const animation = card.animate(
      [
        {
          offset: 0,
          transform: 'none',
          opacity: 1
        },
        {
          offset: 0.85,
          transform: `translate(${translateX}px, ${translateY}px) scale(0.75)`,
          opacity: 0.5
        },
        {
          offset: 1,
          transform: `translate(${translateX}px, ${translateY}px) scale(0.3)`,
          opacity: 0
        }
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0, 0.55, 0.45, 1)',
        fill: 'forwards'
      }
    );
    animation.onfinish = () => {
      card.remove();
    };
  }

  return {
    dragstart: (e) => {
      draggingCards.forEach((el) => {
        dnd.toggleDragging(el, true);
      });
      // console.log(e);
      // console.log(dnd);

      draggedElement = e.target.closest(dnd.options.draggableSelector);
      if (!draggedElement) return;

      items = Array.from(dnd.el.children);

      if (dnd.draggingItems.includes(draggedElement)) {
        draggingCards = [...dnd.draggingItems];
      } else {
        draggingCards = [draggedElement];
      }

      draggingCards.forEach((el) => dnd.toggleDragging(el, true));

      // if (draggingCards.length === 1) {
      //   const ghost = draggedElement.cloneNode(true);
      //   ghost.classList.add('drag-ghost', 'multiply-ghost');
      //   ghost.innerHTML += `<div class="multiply-drop-count">${draggingCards.length}</div>`;

      //   document.body.appendChild(ghost);

      //   // Устанавливаем кастомный drag ghost
      //   // e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      //   const rect = draggedElement.getBoundingClientRect();
      //   e.dataTransfer.setDragImage(
      //     ghost,
      //     e.clientX - rect.left,
      //     e.clientY - rect.top
      //   );

      //   // Очищаем после использования (через таймаут, чтобы браузер успел обработать)
      //   setTimeout(() => {
      //     document.body.removeChild(ghost);
      //   }, 0);
      // }
    },
    dragover(e) {
      if (dnd.isIgnoreSelector(e.target)) {
        return;
      }

      e.preventDefault();

      const closestCard = e.target.closest(dnd.options.draggableSelector);
      const dropZone = e.target.closest('.drop-zone');

      if (activeDropZone) {
        hideDropLine(closestCard);
        return;
      }

      // Таймер активации вложенной зоны
      if (dropZone && dropZone !== activeDropZone) {
        if (!holdTimer) {
          holdTimer = setTimeout(() => {
            activateDropZone(dropZone);
            hideDropLine(closestCard);
          }, holdDelay);
          return;
        }
      }

      // Убираем подсветку с предыдущей карточки, если она была
      if (lastTarget && lastTarget !== closestCard) {
        hideDropLine(lastTarget);
      }

      // Если есть целевая карточка и это не перетаскиваемая
      if (closestCard && closestCard !== draggedElement) {
        const rect = closestCard.getBoundingClientRect();
        const cursorX = e.clientX;
        const xRatio = (cursorX - rect.left) / rect.width;

        // Получаем индексы карточек
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
          // Проверяем, изменится ли порядок
          isInvalidBefore = targetIndex === draggedIndex + 1;
          isInvalidAfter = targetIndex === draggedIndex - 1;
        }


        let position = null;
        if (xRatio <= 0.5 && !isInvalidBefore) {
          position = DROPLINE.before;
        } else if (xRatio > 0.5 && !isInvalidAfter) {
          position = DROPLINE.after;
        }

        // Применяем подсветку
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
      const dropZone = e.target.closest('.drop-zone');

      if (dropZone && dropZone === activeDropZone) {
        // Вставка всех карточек в dropZone

        draggingCards.forEach((card) => {
          // dropZone.appendChild(card);
          animateCardIntoDropZone(card, dropZone);
        });

        deactivateDropZone();
      } else if (closestCard && !draggingCards.includes(closestCard)) {
        const cardRect = closestCard.getBoundingClientRect();
        const insertBefore = e.clientX < cardRect.left + cardRect.width / 2;

        const sort = (test) => {
          // Удаляем все перетаскиваемые карточки из текущих позиций
          test.forEach((item) => item.remove());

          // Вставляем их в новое место
          if (insertBefore) {
            test.forEach((item) => dnd.el.insertBefore(item, closestCard));
            // test.forEach((item) => closestCard.after(item));
          } else {
            const nextSibling = closestCard.nextSibling;
            test.forEach((item) => dnd.el.insertBefore(item, nextSibling));
            // test.forEach((item) => nextSibling.after(item));
          }
        };



        // sort()
        // if (dnd.options.viewTransition && document.startViewTransition) {
        //   console.log('drop');
        //   const a = draggingCards.map(card => {
        //     return card;
        //   });

        //   document.startViewTransition(() => sort(a));
        // } else {
        //   sort(draggingCards);
        // }
        sort(draggingCards);
      }

      deactivateDropZone();

      dnd.options?.onDrop?.(e);
    },
    dragend(e) {
      draggingCards.forEach((el) => dnd.toggleDragging(el, false));
      dnd.options?.onDragEnd?.(e);

      draggingCards = [];
      deactivateDropZone();

      if (lastTarget) {
        hideDropLine(lastTarget);
      }
      lastTarget = null;
    },
    dragleave(e) {
      if (
        e.relatedTarget &&
        // !e.relatedTarget.closest(".card") &&
        !e.relatedTarget.closest('.drop-zone')
      ) {
        deactivateDropZone();
        clearTimeout(holdTimer);
        holdTimer = null;
      }

      const dropLineCards = e.relatedTarget.querySelectorAll(
        '.drag-after, .drag-before'
      );
      Array.from(dropLineCards).forEach((el) => {
        hideDropLine(el);
      });

      dnd.options?.onDragLeave?.(e);
    }
  };
}
