export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Dateオブジェクトをローカルタイムゾーンの YYYY-MM-DD 文字列に変換する
 * @param {Date|string} date 
 * @returns {string} YYYY-MM-DD
 */
export const formatDateLocal = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('sv'); // 'sv' ロケールは YYYY-MM-DD 形式を返す
};
