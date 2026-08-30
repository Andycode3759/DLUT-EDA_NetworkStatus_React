import { useState, useEffect, useCallback, useRef } from 'react';
import { formatBytes, formatMacAddress, formatFee, checkUserAgent } from '../utils/formatters';
import { MAINTENANCE_NOTICE } from '../config/notices';

export function useNetworkStatus() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);
  const hasCheckedFlow = useRef(false);

  const dismissBanner = useCallback(() => {
    setBannerMessage(null);
  }, []);

  const loadData = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);

    if (!navigator.onLine) {
      setData({
        result: 0,
        onlineStatus: '未连接到校园网'
      });
      setIsLoading(false);
      return;
    }

    fetch('http://172.20.30.1/drcom/chkstatus?callback=')
      .then(response => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        let decoder = new TextDecoder('gbk');
        let text = decoder.decode(arrayBuffer);
        let jsonText = "{" + text.split("({")[1].split("})")[0] + "}";
        let parsedData = JSON.parse(jsonText);

        parsedData.terminalType = checkUserAgent(navigator.userAgent);

        // 首次请求时检查 olflow 是否异常（仅在通知开启时检查）
        if (MAINTENANCE_NOTICE.enabled && !hasCheckedFlow.current) {
          hasCheckedFlow.current = true;
          const olflow = parsedData.olflow;
          if (olflow > 162529280 || olflow < 0) {
            setBannerMessage(MAINTENANCE_NOTICE.message);
          }
        }

        // 格式化数据
        const formattedData = {
          result: parsedData.result,
          onlineStatus: parsedData.result === 1 ? '在线' : '离线',
          account: parsedData.uid || '-',
          name: parsedData.NID || '-',
          ipAddress: parsedData.v4ip || parsedData.v46ip || '-',
          macAddress: parsedData.olmac ? formatMacAddress(parsedData.olmac) : '-',
          remainingFlow: parsedData.olflow ? formatBytes(parsedData.olflow) : '-',
          remainingFee: parsedData.fee ? formatFee(parsedData.fee) : '-',
          terminalType: parsedData.terminalType || '-',
          v4ip: parsedData.v4ip,
          v46ip: parsedData.v46ip
        };
        setData(formattedData);
      })
      .catch(() => {
        setData({
          result: 0,
          onlineStatus: `未连接到校园网`
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // 横幅自动关闭
  useEffect(() => {
    if (bannerMessage) {
      const timer = setTimeout(() => setBannerMessage(null), MAINTENANCE_NOTICE.duration);
      return () => clearTimeout(timer);
    }
  }, [bannerMessage]);

  return { data, loadData, bannerMessage, dismissBanner };
}
