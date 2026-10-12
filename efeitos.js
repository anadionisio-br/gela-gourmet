
(() => {
  "use strict";

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  ).matches;

  // REVELAR ELEMENTOS AO ROLAR A PÁGINA
  let observer = null;

  if ("IntersectionObserver" in window && !reducedMotion) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const element = entry.target;
          element.classList.add("visible");

          observer.unobserve(element);

          const delay =
            900 +
            (parseInt(
              element.style.getPropertyValue("--d"),
              10
            ) || 0);

          setTimeout(() => {
            element.classList.remove("reveal", "visible");
          }, delay);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
      }
    );
  }

  window.observeReveal = function (element) {
    if (!observer) {
      element.classList.remove("reveal");
      return;
    }

    observer.observe(element);
  };

  function prepareReveal() {
    const selectors = [
      ".section-head",
      ".steps li",
      ".delivery-grid article",
      ".quote",
      ".faq-list",
      ".photo-story-copy",
      ".story-photo"
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        element.classList.add("reveal");
        element.style.setProperty(
          "--d",
          `${(index % 4) * 90}ms`
        );

        window.observeReveal(element);
      });
    });
  }

  // CABEÇALHO COM SOMBRA AO ROLAR
  function setupHeader() {
    const header = document.getElementById("topo");

    if (!header) return;

    const updateHeader = () => {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };

    updateHeader();

    window.addEventListener("scroll", updateHeader, {
      passive: true
    });
  }

  // EFEITO PARALLAX E INCLINAÇÃO 3D
  function setupHero() {
    const hero = document.getElementById("inicio");
    const stage = document.getElementById("heroStage");

    if (!hero || !stage || reducedMotion) return;

    const layers = hero.querySelectorAll("[data-depth]");

    let ticking = false;
    let heroVisible = true;

    function paint() {
      ticking = false;

      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth) || 0;

        layer.style.setProperty(
          "--py",
          `${(-window.scrollY * depth).toFixed(1)}px`
        );
      });
    }

    function onScroll() {
      if (!heroVisible || ticking) return;

      ticking = true;
      requestAnimationFrame(paint);
    }

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver(
        (entries) => {
          heroVisible = entries[0].isIntersecting;
        }
      );

      visibilityObserver.observe(hero);
    }

    window.addEventListener("scroll", onScroll, {
      passive: true
    });

    // Movimento 3D apenas em dispositivos com mouse
    if (finePointer) {
      let frame = null;

      hero.addEventListener("pointermove", (event) => {
        const rect = stage.getBoundingClientRect();

        let x =
          (event.clientX - (rect.left + rect.width / 2)) /
          rect.width;

        let y =
          (event.clientY - (rect.top + rect.height / 2)) /
          rect.height;

        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));

        if (frame) cancelAnimationFrame(frame);

        frame = requestAnimationFrame(() => {
          stage.style.setProperty(
            "--ry",
            `${(x * 9).toFixed(2)}deg`
          );

          stage.style.setProperty(
            "--rx",
            `${(-y * 7).toFixed(2)}deg`
          );
        });
      });

      hero.addEventListener("pointerleave", () => {
        stage.style.setProperty("--ry", "0deg");
        stage.style.setProperty("--rx", "0deg");
      });
    }

    paint();
  }

  // EFEITO 3D NOS CARDS DE PRODUTOS
  function setupProductCards() {
    if (reducedMotion || !finePointer) return;

    document.addEventListener("pointermove", (event) => {
      const card = event.target.closest(".card");

      if (!card || card.classList.contains("is-off")) return;

      const rect = card.getBoundingClientRect();

      const x =
        (event.clientX - rect.left) / rect.width;

      const y =
        (event.clientY - rect.top) / rect.height;

      card.style.setProperty(
        "--card-rotate-y",
        `${(x - 0.5) * 5}deg`
      );

      card.style.setProperty(
        "--card-rotate-x",
        `${(0.5 - y) * 5}deg`
      );
    });

    document.addEventListener("pointerout", (event) => {
      const card = event.target.closest(".card");

      if (!card) return;

      if (event.relatedTarget && card.contains(event.relatedTarget)) {
        return;
      }

      card.style.setProperty("--card-rotate-y", "0deg");
      card.style.setProperty("--card-rotate-x", "0deg");
    });
  }

  // INICIALIZAÇÃO
  document.addEventListener("DOMContentLoaded", () => {
    prepareReveal();
    setupHeader();
    setupHero();
    setupProductCards();
  });
})();
