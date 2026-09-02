import React from "react";
import { Switch, Typography, Space } from "antd";
import { GlassDrawer, GlassDrawerSection } from "./ui/GlassDrawer";
import { useTheme } from "../contexts/ThemeContext";
import type { PrimaryColor } from "../contexts/ThemeContext";
import {
  BulbOutlined,
  BulbFilled,
  CheckCircleFilled,
} from "@ant-design/icons";

const { Text } = Typography;

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const { mode, toggleMode, primaryColor, setPrimaryColor } = useTheme();

  const colors: Array<{ name: string; value: PrimaryColor; hex: string }> = [
    { name: "Classic Black", value: "black", hex: "#000000" },
    { name: "Tech Blue", value: "blue", hex: "#1677ff" },
    { name: "Royal Purple", value: "purple", hex: "#722ed1" },
    { name: "Fresh Green", value: "green", hex: "#52c41a" },
    { name: "Warm Orange", value: "orange", hex: "#fa8c16" },
  ];

  return (
    <GlassDrawer
      title="介面設定"
      placement="right"
      onClose={onClose}
      open={open}
      width={380}
    >
      <div className="space-y-4">
        {/* Theme Mode */}
        <GlassDrawerSection>
          <div className="mb-4 font-semibold text-slate-800">
            外觀模式
          </div>
          <div className="bg-white/40 p-1 rounded-xl flex border border-white/20">
            <button
              onClick={() => mode === "dark" && toggleMode()}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "light"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Space>
                <BulbOutlined /> 淺色
              </Space>
            </button>
            <button
              onClick={() => mode === "light" && toggleMode()}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "dark"
                  ? "bg-gray-700 shadow-sm text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Space>
                <BulbFilled /> 深色
              </Space>
            </button>
          </div>
        </GlassDrawerSection>

        {/* Primary Color */}
        <GlassDrawerSection>
          <div className="mb-4 font-semibold text-slate-800">
            主題色系
          </div>
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => setPrimaryColor(color.value)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {primaryColor === color.value && (
                  <CheckCircleFilled className="text-white text-lg drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
          <Text type="secondary" className="block mt-2 text-xs">
            選擇您喜好的系統主色調
          </Text>
        </GlassDrawerSection>

        {/* Other Settings Placeholder */}
        <GlassDrawerSection>
          <div className="mb-4 font-semibold text-slate-800">
            顯示設定
          </div>
          <div className="flex items-center justify-between mb-4">
            <Text>緊湊模式</Text>
            <Switch size="small" />
          </div>
          <div className="flex items-center justify-between">
            <Text>減少動畫</Text>
            <Switch size="small" />
          </div>
        </GlassDrawerSection>
      </div>
    </GlassDrawer>
  );
};

export default SettingsDrawer;
