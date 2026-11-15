/**
 * Calendar PNG Export Helper (Domain D - Peter)
 * 
 * Uses ECharts getDataURL to capture high-resolution presentation-ready
 * snapshots of the Burning Activity Calendar with clear metadata, opaque background,
 * and context labels.
 */

/**
 * Downloads a base64 data URL as a file.
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadDataUrl(dataUrl, filename = 'firewatch_calendar.png') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const link = document.createElement('a');
  link.setAttribute('href', dataUrl);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Composites context title, date range, source info, and attribution into the exported image.
 * 
 * @param {string} chartDataUrl Raw PNG from ECharts
 * @param {Object} context
 * @param {string} context.aoiName Name of selected AOI
 * @param {string} context.dateRange Label for active date bounds
 * @param {string} context.sourceLabel Sensor source name
 * @param {string} context.unit Unit of measurement
 * @returns {Promise<string>} Composited PNG data URL
 */
export async function createPresentationCalendarPng(chartDataUrl, context = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return chartDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const padding = 24;
      const headerHeight = 70;
      const footerHeight = 36;

      const canvas = document.createElement('canvas');
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + headerHeight + footerHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(chartDataUrl);
        return;
      }

      // Background: solid light theme
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Banner
      ctx.fillStyle = '#1f2320';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
      ctx.fillText('FireWatch Tanzania — Burning Activity Calendar', padding, padding + 20);

      // Context Subtitle
      ctx.fillStyle = '#5f6864';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
      const aoiText = context.aoiName ? `Area: ${context.aoiName}  |  ` : '';
      const rangeText = context.dateRange ? `Period: ${context.dateRange}  |  ` : '';
      const srcText = context.sourceLabel ? `Sensor Source: ${context.sourceLabel} (${context.unit || 'hotspots'})` : '';
      ctx.fillText(`${aoiText}${rangeText}${srcText}`, padding, padding + 42);

      // Draw Main Heatmap Image
      ctx.drawImage(img, padding, headerHeight);

      // Footer Attribution
      ctx.fillStyle = '#5f6864';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
      ctx.fillText(
        'NASA Space Apps Challenge 2026 — Team Tazama  |  Data: NASA FIRMS (MODIS & VIIRS)',
        padding,
        canvas.height - 14
      );

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      resolve(chartDataUrl);
    };

    img.src = chartDataUrl;
  });
}
