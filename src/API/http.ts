import axios from "axios";
import Cookies from "js-cookie";
import { redirectToLogin as spaRedirectToLogin } from "@/utils/navigation";

// Типы для axios
type AxiosInstance = ReturnType<typeof axios.create>;
type AxiosError = any;

// Primary Backend URL - используется для основных операций
const PRIMARY_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://lesser-felicdad-promconsulting-79f07228.koyeb.app';

// Secondary Backend URL - используется для дополнительных сервисов
const SECONDARY_BACKEND_URL = import.meta.env.VITE_SECONDARY_BACKEND_URL || 'https://octobackend.com/api/main/';

// Primary API instance (default) - используется для всех существующих эндпоинтов
const $api = axios.create({
    baseURL: PRIMARY_BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor для добавления токена ко всем запросам Primary API
$api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token') || Cookies.get('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Alias for primary API
export const $apiPrimary = $api;
// Named export для удобства
export { $api };

// Secondary API instance - для специфичных сервисов, требующих второй бэкенд
export const $apiSecondary = axios.create({
    baseURL: SECONDARY_BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor для добавления токена ко всем запросам Secondary API
$apiSecondary.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token') || Cookies.get('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Функция для обновления access token с помощью refresh token
let isRefreshing = false;
let failedQueue: any[] = [];
let isRedirecting = false; // Флаг для предотвращения множественных редиректов
const REFRESH_TOKEN_COOKIE_NAMES = ['refreshToken', 'refresh_token', 'refresh-token'];
const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 минут, обновляем заранее до истечения access token
let tokenRefreshIntervalId: number | null = null;

const readRefreshTokenFromCookies = (): string | null => {
    for (const cookieName of REFRESH_TOKEN_COOKIE_NAMES) {
        const cookieValue = Cookies.get(cookieName);
        if (cookieValue) {
            return cookieValue;
        }
    }
    return null;
};

const getStoredRefreshToken = (): string | null => {
    return localStorage.getItem('refresh_token') || readRefreshTokenFromCookies();
};

const syncRefreshTokenFromCookies = (): string | null => {
    const cookieToken = readRefreshTokenFromCookies();
    if (cookieToken) {
        localStorage.setItem('refresh_token', cookieToken);
        return cookieToken;
    }
    return null;
};

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const refreshAccessToken = async (): Promise<string | null> => {
    try {
        const refreshToken = getStoredRefreshToken();
        const hasRefreshToken = !!refreshToken;

        console.log('🔄 Attempting to refresh access token...');

        const organizationName = localStorage.getItem('organization_name');
        const userType = localStorage.getItem('user_type'); // Получаем тип пользователя

        // Для admin НЕ передаем refreshToken в body - он берется из httpOnly cookies
        const refreshPayload: Record<string, any> = {};
        if (organizationName) {
            refreshPayload.organizationName = organizationName;
        }

        // Определяем какой эндпоинт использовать на основе типа пользователя
        let refreshEndpoint = '';
        let needsRefreshTokenInBody = true; // По умолчанию требуется refresh token в body

        if (userType === 'admin') {
            refreshEndpoint = `${SECONDARY_BACKEND_URL}/admin/refresh`;
            needsRefreshTokenInBody = false; // Admin берет refresh token из cookies
        } else if (userType === 'staff') {
            refreshEndpoint = `${SECONDARY_BACKEND_URL}/staffAuthorization/refresh`;
            if (!hasRefreshToken) {
                console.error('❌ No refresh token available for staff refresh');
                return null;
            }
            refreshPayload.refreshToken = refreshToken; // Staff требует refresh token в body
        } else if (userType === 'user') {
            refreshEndpoint = `${SECONDARY_BACKEND_URL}/user/refresh`;
            if (!hasRefreshToken) {
                console.error('❌ No refresh token available for user refresh');
                return null;
            }
            refreshPayload.refreshToken = refreshToken; // User требует refresh token в body
        } else {
            // Если тип не определен, пробуем все три
            console.log('User type not set, trying admin first...');
        }

        // Если тип пользователя определен, используем конкретный эндпоинт
        if (refreshEndpoint) {
            try {
                console.log(`Trying ${userType} refresh endpoint:`, refreshEndpoint);
                const response = await axios.post(
                    refreshEndpoint,
                    needsRefreshTokenInBody ? refreshPayload : {}, // Admin: пустой body, остальные: с данными
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        withCredentials: true, // ВАЖНО: позволяет отправлять httpOnly cookies
                    }
                );

                const data: any = response.data;
                const accessToken = data.token || data.accessToken;

                if (accessToken) {
                    // Сохраняем новый access token
                    localStorage.setItem('auth_token', accessToken);
                    localStorage.setItem('access_token', accessToken);
                    Cookies.set('token', accessToken, {
                        expires: 365,
                        path: '/',
                        sameSite: 'lax'
                    });
                    // Если backend вернул новый refresh token в cookies - сохраняем его в localStorage
                    const updatedRefreshToken = syncRefreshTokenFromCookies();
                    if (updatedRefreshToken) {
                        console.log('🔁 Refresh token synced from cookies after refresh');
                    }
                    console.log(`✅ Access token refreshed successfully via ${userType} endpoint`);
                    return accessToken;
                }
            } catch (error: any) {
                console.error(`❌ ${userType} refresh failed:`, error.message);
                // Если refresh token истек (401), прекращаем попытки
                if (error.response?.status === 401) {
                    console.error('🚫 Refresh token expired, clearing session');
                    localStorage.clear();
                }
                throw error;
            }
        }

        // Fallback: если тип пользователя не определен, пробуем оба эндпоинта
        // Пробуем сначала /admin/refresh (БЕЗ refreshToken в body - он в httpOnly cookie)
        try {
            console.log('Trying /admin/refresh endpoint...');
            const adminResponse = await axios.post(
                `${SECONDARY_BACKEND_URL}/admin/refresh`,
                {}, // Пустой body - refresh token берется из httpOnly cookies
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    withCredentials: true, // ВАЖНО: для отправки httpOnly cookies
                }
            );

            const adminData: any = adminResponse.data;
            const accessToken = adminData.token || adminData.accessToken;

            if (accessToken) {
                // Сохраняем тип пользователя для будущих запросов
                localStorage.setItem('user_type', 'admin');
                // Сохраняем новый access token
                localStorage.setItem('auth_token', accessToken);
                localStorage.setItem('access_token', accessToken);
                Cookies.set('token', accessToken, {
                    expires: 365,
                    path: '/',
                    sameSite: 'lax'
                });
                // Если backend вернул новый refresh token в cookies - сохраняем его в localStorage
                const updatedRefreshToken = syncRefreshTokenFromCookies();
                if (updatedRefreshToken) {
                    console.log('🔁 Refresh token synced from cookies after refresh');
                }
                console.log('✅ Access token refreshed successfully via /admin/refresh');
                return accessToken;
            }
        } catch (adminError: any) {
            // Если admin refresh не сработал (но не 401), логируем и пробуем staff refresh
            if (adminError.response?.status !== 401) {
                console.warn('⚠️ Admin refresh failed with non-401 error:', adminError.message);
            } else {
                console.log('Admin refresh returned 401, trying /staffAuthorization/refresh...');
            }
        }

        // Пробуем /staffAuthorization/refresh
        try {
            if (!hasRefreshToken) {
                throw new Error('No refresh token available for staff refresh');
            }
            console.log('Trying /staffAuthorization/refresh endpoint...');
            const staffResponse = await axios.post(
                `${SECONDARY_BACKEND_URL}/staffAuthorization/refresh`,
                { refreshToken }, // Staff требует refreshToken в body
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    withCredentials: true,
                }
            );

            const staffData: any = staffResponse.data;
            const accessToken = staffData.accessToken || staffData.data?.accessToken || staffData.data?.token || staffData.token;

            if (accessToken) {
                // Сохраняем тип пользователя для будущих запросов
                localStorage.setItem('user_type', 'staff');
                // Сохраняем новый access token
                localStorage.setItem('auth_token', accessToken);
                localStorage.setItem('access_token', accessToken);
                Cookies.set('token', accessToken, {
                    expires: 365,
                    path: '/',
                    sameSite: 'lax'
                });
                // Если backend вернул новый refresh token в cookies - сохраняем его в localStorage
                const updatedRefreshToken = syncRefreshTokenFromCookies();
                if (updatedRefreshToken) {
                    console.log('🔁 Refresh token synced from cookies after refresh');
                }
                console.log('✅ Access token refreshed successfully via /staffAuthorization/refresh');
                return accessToken;
            }
        } catch (staffError: any) {
            // Если staff refresh не сработал (но не 401), логируем и пробуем user refresh
            if (staffError.response?.status !== 401) {
                console.warn('⚠️ Staff refresh failed with non-401 error:', staffError.message);
            } else {
                console.log('Staff refresh returned 401, trying /user/refresh...');
            }
        }

        // Пробуем /user/refresh как последний fallback
        if (!hasRefreshToken) {
            throw new Error('No refresh token available for user refresh');
        }
        const response = await axios.post(
            `${SECONDARY_BACKEND_URL}/user/refresh`,
            { refreshToken }, // User требует refreshToken в body
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true,
            }
        );

        const data: any = response.data;
        const accessToken = data.accessToken || data.token;

        if (accessToken) {
            // Сохраняем тип пользователя для будущих запросов
            localStorage.setItem('user_type', 'user');
            // Сохраняем новый access token
            localStorage.setItem('auth_token', accessToken);
            localStorage.setItem('access_token', accessToken);
            Cookies.set('token', accessToken, {
                expires: 365,
                path: '/',
                sameSite: 'lax'
            });
            // Если backend вернул новый refresh token в cookies - сохраняем его в localStorage
            const updatedRefreshToken = syncRefreshTokenFromCookies();
            if (updatedRefreshToken) {
                console.log('🔁 Refresh token synced from cookies after refresh');
            }
            console.log('✅ Access token refreshed successfully via /user/refresh');
            return accessToken;
        }

        return null;
    } catch (error: any) {
        console.error('❌ Failed to refresh token:', error);
        // Если refresh token тоже истек (401), прекращаем попытки
        if (error.response?.status === 401) {
            console.error('🚫 Refresh token expired, clearing session');
            localStorage.clear();
        }
        return null;
    }
};

const waitForRefresh = () => {
    return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
    });
};

const runTokenRefresh = async (): Promise<string | null> => {
    if (isRefreshing) {
        return waitForRefresh();
    }

    isRefreshing = true;

    try {
        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
            processQueue(null, newAccessToken);
            return newAccessToken;
        }

        processQueue(new Error('Unable to refresh token'), null);
        return null;
    } catch (error) {
        processQueue(error, null);
        throw error;
    } finally {
        isRefreshing = false;
    }
};

export const requestTokenRefresh = runTokenRefresh;

const startTokenRefreshScheduler = () => {
    if (typeof window === 'undefined') {
        return;
    }

    if (tokenRefreshIntervalId !== null) {
        return;
    }

    tokenRefreshIntervalId = window.setInterval(async () => {
        const refreshToken = getStoredRefreshToken();
        const userType = localStorage.getItem('user_type');

        // Для admin refresh token может быть только в httpOnly cookie (недоступен JS),
        // поэтому не блокируем расписание при его отсутствии
        const canAttemptRefresh = refreshToken || userType === 'admin' || !userType;
        if (!canAttemptRefresh) {
            return;
        }

        console.log('⏰ Scheduled token refresh triggered');

        try {
            await runTokenRefresh();
        } catch (error) {
            console.error('❌ Scheduled token refresh failed:', error);
        }
    }, TOKEN_REFRESH_INTERVAL_MS);
};

const redirectToLogin = () => {
    if (!isRedirecting) {
        isRedirecting = true;
        localStorage.clear();
        console.log('🔄 Redirecting to login...');
        spaRedirectToLogin();
    }
};

const attachTokenRefreshInterceptor = (apiInstance: AxiosInstance) => {
    apiInstance.interceptors.response.use(
        (response: any) => response,
        async (error: AxiosError) => {
            const originalRequest: any = error.config || {};

            if (error.response?.status !== 401 || originalRequest._retry) {
                return Promise.reject(error);
            }

            try {
                originalRequest._retry = true;
                const newAccessToken = await runTokenRefresh();

                if (newAccessToken) {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return apiInstance(originalRequest);
                }

                redirectToLogin();
                return Promise.reject(error);
            } catch (refreshError) {
                redirectToLogin();
                return Promise.reject(refreshError);
            }
        }
    );
};

attachTokenRefreshInterceptor($api);
attachTokenRefreshInterceptor($apiSecondary);
startTokenRefreshScheduler();

// Default export - Primary API (для обратной совместимости со всем существующим кодом)
export default $api;

/**
 * Создает полный URL для API endpoint
 * @param endpoint - путь эндпоинта (например, '/api/tasks')
 * @param useSecondary - использовать ли вторичный бэкенд (по умолчанию false)
 * @returns полный URL
 */
export const createApiUrl = (endpoint: string, useSecondary = false): string => {
    const baseUrl = useSecondary ? SECONDARY_BACKEND_URL : PRIMARY_BACKEND_URL;
    // Убираем двойные слэши
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
};

/**
 * Выполняет GET запрос с JSON ответом
 * @param endpoint - путь эндпоинта
 * @param useSecondary - использовать ли вторичный бэкенд
 */
export const apiGetJson = async (endpoint: string, useSecondary = false): Promise<any> => {
    const url = createApiUrl(endpoint, useSecondary);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

/**
 * Выполняет POST запрос с JSON телом
 * @param endpoint - путь эндпоинта
 * @param data - данные для отправки
 * @param useSecondary - использовать ли вторичный бэкенд
 */
export const apiPostJson = async (endpoint: string, data: any, useSecondary = false): Promise<any> => {
    const url = createApiUrl(endpoint, useSecondary);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

/**
 * Выполняет PATCH запрос с JSON телом
 * @param endpoint - путь эндпоинта
 * @param data - данные для отправки
 * @param useSecondary - использовать ли вторичный бэкенд
 */
export const apiPatchJson = async (endpoint: string, data: any, useSecondary = false): Promise<any> => {
    const url = createApiUrl(endpoint, useSecondary);
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

/**
 * Выполняет DELETE запрос
 * @param endpoint - путь эндпоинта
 * @param useSecondary - использовать ли вторичный бэкенд
 */
export const apiDelete = async (endpoint: string, useSecondary = false): Promise<any> => {
    const url = createApiUrl(endpoint, useSecondary);
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

// Экспортируем URL для прямого использования
export { PRIMARY_BACKEND_URL, SECONDARY_BACKEND_URL };
