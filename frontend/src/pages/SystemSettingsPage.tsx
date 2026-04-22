import React, { useEffect, useState } from "react";
import {
  Alert,
  Switch,
  Slider,
  InputNumber,
  Button,
  Typography,
  Divider,
  Form,
  message,
  Select,
  Spin,
} from "antd";
import { motion } from "framer-motion";
import {
  SettingOutlined,
  BellOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import { payrollService } from "../services/payroll.service";

const { Title, Text } = Typography;
const { Option } = Select;

const DEFAULT_FORM_VALUES = {
  emailNotifications: true,
  pushNotifications: true,
  aiConfidenceThreshold: 80,
  aiAutoFillSuggestions: true,
  sessionTimeout: 30,
  passwordExpiry: 90,
  language: "zh-TW",
  standardMonthlyHours: 240,
  overtimeMultiplier: 1.33,
  twLaborInsuranceRatePercent: 2.2,
  twHealthInsuranceRatePercent: 1.5,
  cnSocialInsuranceRatePercent: 10.5,
};

const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPayrollSettings = async () => {
    setLoading(true);
    try {
      const settings = await payrollService.getPayrollSettings();
      form.setFieldsValue({
        ...DEFAULT_FORM_VALUES,
        standardMonthlyHours: settings.standardMonthlyHours,
        overtimeMultiplier: settings.overtimeMultiplier,
        twLaborInsuranceRatePercent: settings.twLaborInsuranceRate * 100,
        twHealthInsuranceRatePercent: settings.twHealthInsuranceRate * 100,
        cnSocialInsuranceRatePercent: settings.cnSocialInsuranceRate * 100,
      });
    } catch (error) {
      form.setFieldsValue(DEFAULT_FORM_VALUES);
      message.error("薪資規則載入失敗，已先帶入預設值");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue(DEFAULT_FORM_VALUES);
    fetchPayrollSettings();
  }, [form]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      await payrollService.updatePayrollSettings({
        standardMonthlyHours: values.standardMonthlyHours,
        overtimeMultiplier: values.overtimeMultiplier,
        twLaborInsuranceRate: values.twLaborInsuranceRatePercent / 100,
        twHealthInsuranceRate: values.twHealthInsuranceRatePercent / 100,
        cnSocialInsuranceRate: values.cnSocialInsuranceRatePercent / 100,
      });
      message.success("薪資規則已更新，之後新跑的薪資批次會套用這組設定");
    } catch (error) {
      if ((error as any)?.errorFields) {
        return;
      }
      console.error(error);
      message.error("薪資規則更新失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-1 !font-light">
            系統參數設定
          </Title>
          <Text type="secondary">管理通知、安全與 AI 協作方式</Text>
        </div>
        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={handleSave}
          size="large"
          loading={saving}
        >
          儲存變更
        </Button>
      </div>

      <Alert
        type="info"
        showIcon
        message="少即是多，大道至簡"
        description="AI 的工作是理解問題、找資料、整理答案；高風險決策仍應由制度、權限與人工複核來把關。"
        className="!rounded-2xl !border-sky-200 !bg-sky-50/80"
      />

      <Alert
        type="warning"
        showIcon
        message="目前已正式接上後端的，是下方的「薪資規則」區塊"
        description="通知、AI 與一般設定暫時仍屬介面預留；真正會影響薪資計算的工時、加班倍率與保險比例，現在都會寫入後端。"
        className="!rounded-2xl !border-amber-200 !bg-amber-50/80"
      />

      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={DEFAULT_FORM_VALUES}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <CalculatorOutlined className="text-2xl text-violet-600" />
                <Title level={4} className="!m-0">
                  薪資規則
                </Title>
              </div>

              <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-xs leading-6 text-slate-600">
                這一區會直接影響薪資自動計算。你調整後，新的薪資批次會改用這組規則，不需要再碰程式。
              </div>

              <Form.Item
                label="月薪換算工時"
                name="standardMonthlyHours"
                rules={[{ required: true, type: "number", min: 1, max: 744 }]}
                extra="目前用來把月薪換算成時薪，進一步計算請假扣款與加班。"
              >
                <InputNumber className="w-full" />
              </Form.Item>

              <Form.Item
                label="加班倍率"
                name="overtimeMultiplier"
                rules={[{ required: true, type: "number", min: 1, max: 5 }]}
                extra="目前系統會用單一倍率計算加班費。"
              >
                <InputNumber className="w-full" min={1} max={5} step={0.01} />
              </Form.Item>

              <Form.Item
                label="台灣勞保員工自付 (%)"
                name="twLaborInsuranceRatePercent"
                rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              >
                <InputNumber className="w-full" min={0} max={100} step={0.01} />
              </Form.Item>

              <Form.Item
                label="台灣健保員工自付 (%)"
                name="twHealthInsuranceRatePercent"
                rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              >
                <InputNumber className="w-full" min={0} max={100} step={0.01} />
              </Form.Item>

              <Form.Item
                label="中國社保員工自付 (%)"
                name="cnSocialInsuranceRatePercent"
                rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              >
                <InputNumber className="w-full" min={0} max={100} step={0.01} />
              </Form.Item>
            </div>

            {/* Notification Settings */}
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <BellOutlined className="text-2xl text-blue-500" />
                <Title level={4} className="!m-0">
                  通知設定
                </Title>
              </div>

              <Form.Item
                label="電子郵件通知"
                name="emailNotifications"
                valuePropName="checked"
                extra="當有重要待辦事項或審核結果時發送 Email"
              >
                <Switch />
              </Form.Item>

              <Divider />

              <Form.Item
                label="系統推播通知"
                name="pushNotifications"
                valuePropName="checked"
                extra="在瀏覽器中顯示即時推播通知"
              >
                <Switch />
              </Form.Item>
            </div>

            {/* AI Settings */}
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <RobotOutlined className="text-2xl text-sky-600" />
                <Title level={4} className="!m-0">
                  AI 協作方式
                </Title>
              </div>

              <div className="mb-5 rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-xs leading-6 text-slate-500">
                原則很簡單：AI
                先幫你縮小範圍、整理答案；真的需要拍板的地方，再交回人工確認。
              </div>

              <Form.Item
                label="低信心轉人工複核門檻 (%)"
                name="aiConfidenceThreshold"
                extra="低於此門檻時，系統只提供建議，不幫你直接下判斷。"
              >
                <Slider
                  marks={{ 0: "0%", 50: "50%", 80: "80%", 100: "100%" }}
                  step={5}
                />
              </Form.Item>

              <Form.Item
                label="自動帶入 AI 建議欄位"
                name="aiAutoFillSuggestions"
                valuePropName="checked"
                extra="例如自動帶入推薦項目、預估金額或摘要，但不直接替你核准。"
              >
                <Switch />
              </Form.Item>
            </div>

            {/* Security Settings */}
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <SafetyCertificateOutlined className="text-2xl text-green-500" />
                <Title level={4} className="!m-0">
                  安全性設定
                </Title>
              </div>

              <Form.Item
                label="閒置登出時間 (分鐘)"
                name="sessionTimeout"
                rules={[{ required: true, type: "number", min: 5, max: 120 }]}
              >
                <InputNumber className="w-full" />
              </Form.Item>

              <Form.Item
                label="密碼強制更換週期 (天)"
                name="passwordExpiry"
                rules={[{ required: true, type: "number", min: 30, max: 365 }]}
              >
                <InputNumber className="w-full" />
              </Form.Item>
            </div>

            {/* General Settings */}
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-6">
                <SettingOutlined className="text-2xl text-gray-500" />
                <Title level={4} className="!m-0">
                  一般設定
                </Title>
              </div>

              <Form.Item label="系統預設語言" name="language">
                <Select>
                  <Option value="zh-TW">繁體中文 (Traditional Chinese)</Option>
                  <Option value="en-US">English (US)</Option>
                </Select>
              </Form.Item>
            </div>
          </div>
        </Form>
      </Spin>
    </motion.div>
  );
};

export default SystemSettingsPage;
