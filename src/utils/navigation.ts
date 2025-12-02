import { navigate } from "wouter/use-browser-location";

type NavigateOptions = {
  replace?: boolean;
};

let isNavigating = false;

/**
 * Выполняет SPA-навигацию, не перезагружая страницу.
 * При ошибке навигации делает graceful fallback на native location.
 */
export const navigateTo = (path: string, options: NavigateOptions = {}) => {
  if (typeof window === "undefined" || !path) {
    return;
  }

  if (isNavigating) {
    return;
  }

  isNavigating = true;

  try {
    navigate(path, options);
  } catch (error) {
    // Если navigate недоступен (например, вне SPA), используем стандартную навигацию
    if (options.replace) {
      window.location.replace(path);
    } else {
      window.location.assign(path);
    }
  } finally {
    // Разрешаем следующую навигацию только после текущего кадра
    requestAnimationFrame(() => {
      isNavigating = false;
    });
  }
};

export const redirectToLogin = () => {
  navigateTo("/login", { replace: true });
};
