import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Switch,
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
  SafetyCertificateOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import { payrollService } from "../services/payroll.service";
import { resolveEntityId } from "../services/entities.service";

const { Title, Text } = Typography;
const { Option } = Select;

const UNBACKED_FORM_VALUES = {
  emailNotifications: true,
  pushNotifications: true,
  sessionTimeout: 30,
  passwordExpiry: 90,
  language: "zh-TW",
};

const PAYROLL_FIELD_NAMES = [
  "standardMonthlyHours",
  "overtimeMultiplier",
  "twLaborInsuranceRatePercent",
  "twHealthInsuranceRatePercent",
  "cnSocialInsuranceRatePercent",
] as const;

const rateToPercent = (rate: number) =>
  Number((Number(rate) * 100).toFixed(4));

const percentToRate = (percent: number) =>
  Number((Number(percent) / 100).toFixed(6));

const isFormValidationError = (
  error: unknown,
): error is { errorFields: unknown[] } =>
  typeof error === "object" && error !== null && "errorFields" in error;

const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payrollSettingsLoaded, setPayrollSettingsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPayrollSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setPayrollSettingsLoaded(false);
    form.resetFields([...PAYROLL_FIELD_NAMES]);
    try {
      const entityId = await resolveEntityId();
      const settings = await payrollService.getPayrollSettings(entityId);
      form.setFieldsValue({
        standardMonthlyHours: settings.standardMonthlyHours,
        overtimeMultiplier: settings.overtimeMultiplier,
        twLaborInsuranceRatePercent: rateToPercent(
          settings.twLaborInsuranceRate,
        ),
        twHealthInsuranceRatePercent: rateToPercent(
          settings.twHealthInsuranceRate,
        ),
        cnSocialInsuranceRatePercent: rateToPercent(
          settings.cnSocialInsuranceRate,
        ),
      });
      setPayrollSettingsLoaded(true);
    } catch (error) {
      console.error(error);
      form.resetFields([...PAYROLL_FIELD_NAMES]);
      setLoadError("無法讀取目前的薪資規則。為避免覆寫既有設定，儲存功能已停用。");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchPayrollSettings();
  }, [fetchPayrollSettings]);

  const handleSave = async () => {
    if (!payrollSettingsLoaded || loading) {
      message.warning("請先成功載入薪資規則，再進行儲存");
      return;
    }

    try {
      setSaving(true);
      const values = await form.validateFields([...PAYROLL_FIELD_NAMES]);
      const entityId = await resolveEntityId();
      const settings = await payrollService.updatePayrollSettings(
        entityId,
        {
          standardMonthlyHours: values.standardMonthlyHours,
          overtimeMultiplier: values.overtimeMultiplier,
          twLaborInsuranceRate: percentToRate(
            values.twLaborInsuranceRatePercent,
          ),
          twHealthInsuranceRate: percentToRate(
            values.twHealthInsuranceRatePercent,
          ),
          cnSocialInsuranceRate: percentToRate(
            values.cnSocialInsuranceRatePercent,
          ),
        },
      );
      form.setFieldsValue({
        standardMonthlyHours: settings.standardMonthlyHours,
        overtimeMultiplier: settings.overtimeMultiplier,
        twLaborInsuranceRatePercent: rateToPercent(
          settings.twLaborInsuranceRate,
        ),
        twHealthInsuranceRatePercent: rateToPercent(
          settings.twHealthInsuranceRate,
        ),
        cnSocialInsuranceRatePercent: rateToPercent(
          settings.cnSocialInsuranceRate,
        ),
      });
      message.success("薪資規則已更新，之後新跑的薪資批次會套用這組設定");
    } catch (error) {
      if (isFormValidationError(error)) {
        return;
      }
      console.error(error);
      message.error("薪資規則更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const payrollInputsDisabled = loading || saving || !payrollSettingsLoaded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={2} className="!mb-1 !font-light">
            系統參數設定
          </Title>
          <Text type="secondary">管理會直接套用於薪資計算的規則</Text>
        </div>
        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={handleSave}
          size="large"
          loading={saving}
          disabled={loading || !payrollSettingsLoaded}
          className="w-full sm:w-auto"
        >
          儲存薪資規則
        </Button>
      </div>

      <Alert
        type="warning"
        showIcon
        message="目前僅薪資規則會寫入後端"
        description="通知、安全與一般設定尚未啟用。"
        className="!rounded-2xl !border-amber-200 !bg-amber-50/80"
      />

      {loadError && (
        <Alert
          type="error"
          showIcon
          message="薪資規則載入失敗"
          description={loadError}
          action={
            <Button onClick={fetchPayrollSettings} disabled={loading}>
              重新載入
            </Button>
          }
          className="!rounded-2xl"
        />
      )}

      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={UNBACKED_FORM_VALUES}>
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
                <InputNumber className="w-full" disabled={payrollInputsDisabled} />
              </Form.Item>

              <Form.Item
                label="加班倍率"
                name="overtimeMultiplier"
                rules={[{ required: true, type: "number", min: 1, max: 5 }]}
                extra="目前系統會用單一倍率計算加班費。"
              >
                <InputNumber
                  className="w-full"
                  min={1}
                  max={5}
                  step={0.01}
                  disabled={payrollInputsDisabled}
                />
              </Form.Item>

              <Form.Item
                label="台灣勞保員工自付 (%)"
                name="twLaborInsuranceRatePercent"
                rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={4}
                  disabled={payrollInputsDisabled}
                />
              </Form.Item>

              <Form.Item
                label="台灣健保員工自付 (%)"
                name="twHealthInsuranceRatePercent"
                rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={4}
                  disabled={payrollInputsDisabled}
                />
              </Form.Item>

              <Form.Item
                label="中國社保員工自付 (%)"
                name="cnSocialInsuranceRatePercent"
                rules={[{ required: true, type: "number", min: 0, max: 100 }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={4}
                  disabled={payrollInputsDisabled}
                />
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

              <Alert
                type="info"
                showIcon
                message="尚未接上後端，目前僅供介面預覽，不會儲存"
                className="!mb-5 !rounded-xl"
              />

              <Form.Item
                label="電子郵件通知"
                name="emailNotifications"
                valuePropName="checked"
                extra="當有重要待辦事項或審核結果時發送 Email"
              >
                <Switch disabled />
              </Form.Item>

              <Divider />

              <Form.Item
                label="系統推播通知"
                name="pushNotifications"
                valuePropName="checked"
                extra="在瀏覽器中顯示即時推播通知"
              >
                <Switch disabled />
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

              <Alert
                type="info"
                showIcon
                message="尚未接上後端，目前僅供介面預覽，不會儲存"
                className="!mb-5 !rounded-xl"
              />

              <Form.Item
                label="閒置登出時間 (分鐘)"
                name="sessionTimeout"
                rules={[{ required: true, type: "number", min: 5, max: 120 }]}
              >
                <InputNumber className="w-full" disabled />
              </Form.Item>

              <Form.Item
                label="密碼強制更換週期 (天)"
                name="passwordExpiry"
                rules={[{ required: true, type: "number", min: 30, max: 365 }]}
              >
                <InputNumber className="w-full" disabled />
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

              <Alert
                type="info"
                showIcon
                message="尚未接上後端，目前僅供介面預覽，不會儲存"
                className="!mb-5 !rounded-xl"
              />

              <Form.Item label="系統預設語言" name="language">
                <Select disabled>
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
