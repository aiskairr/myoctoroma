import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface PrivacyConsentProps {
  storageKey?: string;
  policyUrl?: string;
  title?: string;
  description?: string;
}

const PrivacyConsent: React.FC<PrivacyConsentProps> = ({
  storageKey = "privacy_consent_v1",
  policyUrl,
  title = "Политика конфиденциальности",
  description = "Мы используем введенные данные и файлы только для обработки вашего запроса и улучшения сервиса. Продолжая, вы подтверждаете согласие с обработкой персональных данных и условиями Политики конфиденциальности."
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(storageKey);
      if (!accepted) setVisible(true);
    } catch (_) {}
  }, [storageKey]);

  const accept = () => {
    try {
      localStorage.setItem(storageKey, "accepted");
    } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-5xl px-4 pb-4">
        <div className="rounded-lg border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg border-gray-200 p-4 text-sm md:flex md:items-center md:justify-between dark:bg-gray-900/95 dark:border-gray-800">
          <div className="mb-3 md:mb-0 md:mr-4">
            <div className="font-medium mb-1">{title}</div>
            <div className="text-gray-600 dark:text-gray-300">
              {description}{" "}
              {policyUrl ? (
                <a href={policyUrl} target="_blank" rel="noreferrer" className="underline">Читать подробнее</a>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={() => setVisible(false)}>Позже</Button>
            <Button onClick={accept}>Согласен</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsent;
