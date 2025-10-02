import type { Branch } from "@/contexts/BranchContext";

/**
 * Получает правильный branchId из объекта филиала
 * Возвращает строковое представление ID филиала для использования в API
 */
export function getBranchId(branch: Branch | null | undefined): string {
  if (!branch) {
    console.warn('🚨 Branch is null/undefined, cannot get branchId');
    return '';
  }
  
  // Используем waInstance если доступен (для совместимости с WhatsApp интеграцией)
  if (branch.waInstance) {
    return branch.waInstance;
  }
  
  // Fallback на ID как строку
  return branch.id.toString();
}

/**
 * Получает правильный branchId или возвращает fallback значение
 * ВАЖНО: Не используйте hardcoded fallback значения типа 'wa1' или '1'
 * Вместо этого используйте эту функцию с первым доступным филиалом
 */
export function getBranchIdWithFallback(
  currentBranch: Branch | null | undefined, 
  allBranches: Branch[] = []
): string {
  // Сначала пытаемся получить ID от текущего филиала
  const branchId = getBranchId(currentBranch);
  if (branchId) {
    return branchId;
  }
  
  // Если текущего филиала нет, берем первый доступный
  if (allBranches.length > 0) {
    const fallbackBranch = allBranches[0];
    console.warn(`🔄 Using fallback branch: ${fallbackBranch.branches} (${getBranchId(fallbackBranch)})`);
    return getBranchId(fallbackBranch);
  }
  
  // Если нет вообще никаких филиалов, возвращаем пустую строку
  console.error('❌ No branches available, returning empty branchId');
  return '';
}

/**
 * Проверяет, валиден ли branchId (не пустой и не является hardcoded значением)
 */
export function isValidBranchId(branchId: string | undefined | null): boolean {
  if (!branchId || branchId.trim() === '') {
    return false;
  }
  
  // Предупреждаем об использовании hardcoded значений
  const hardcodedValues = ['wa1', '1', 'wa2', 'wa3', 'wa4'];
  if (hardcodedValues.includes(branchId)) {
    console.warn(`⚠️ Using potentially hardcoded branchId: ${branchId}. Consider using getBranchIdWithFallback instead.`);
  }
  
  return true;
}
