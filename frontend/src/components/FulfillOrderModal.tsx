import React, { useState, useEffect } from 'react'
import { Modal, Form, Select, message, Typography } from 'antd'
import { isAxiosError } from 'axios'
import { SalesOrder, salesService } from '../services/sales.service'
import { inventoryService } from '../services/inventory.service'
import { resolveEntityId } from '../services/entities.service'
import { ScanOutlined } from '@ant-design/icons'

const { Title } = Typography

type Warehouse = { id: string; code?: string; name: string }

interface FulfillOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: SalesOrder
}

const FulfillOrderModal: React.FC<FulfillOrderModalProps> = ({ open, onClose, onSuccess, order }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  useEffect(() => {
    if (open) {
      form.resetFields()
      void (async () => {
        try {
          const entityId = await resolveEntityId()
          const data: Warehouse[] = await inventoryService.getWarehouses(entityId)
          setWarehouses(data)
          if (data.length > 0) form.setFieldValue('warehouseId', data[0].id)
        } catch {
          setWarehouses([])
          message.error('無法載入出貨倉庫')
        }
      })()
    }
  }, [form, open])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const entityId = await resolveEntityId()
      
      const itemSerialNumbers: Record<string, string[]> = {}
      
      order.items?.forEach((item) => {
        if (item.id && item.hasSerialNumbers) {
          const sns = values[item.id]
          if (sns) {
             itemSerialNumbers[item.id] = sns
          }
        }
      })

      await salesService.fulfill(order.id, {
        warehouseId: values.warehouseId,
        itemSerialNumbers
      }, entityId)

      message.success('訂單已完成出貨扣庫')
      onSuccess()
      onClose()
    } catch (error: unknown) {
      if ((error as { errorFields?: unknown[] })?.errorFields) return
      const apiMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined
      message.error(apiMessage || '出貨失敗，庫存未變更')
    } finally {
      setLoading(false)
    }
  }

  const snItems = order.items?.filter((item) => item.id && item.hasSerialNumbers) || []

  return (
    <Modal
      title="訂單出貨"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="確認出貨"
      cancelText="取消"
      okButtonProps={{ disabled: warehouses.length === 0 }}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="warehouseId" 
          label="出貨倉庫"
          rules={[{ required: true, message: '請選擇出貨倉庫' }]}
        >
          <Select>
            {warehouses.map(w => (
              <Select.Option key={w.id} value={w.id}>{w.code ? `${w.code} · ` : ''}{w.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {snItems.length > 0 && (
          <>
            <Title level={5}>商品序號</Title>
            {snItems.map((item) => (
              <Form.Item
                key={item.id}
                name={item.id}
                label={`${item.productName}（${item.sku || item.productId}）· ${item.quantity} 組`}
                rules={[
                  { required: true, message: '請掃描或輸入序號' },
                  { 
                    validator: (_, value) => {
                      if (!value || value.length !== Number(item.quantity) || new Set(value).size !== value.length) {
                        return Promise.reject(new Error(`必須輸入 ${item.quantity} 組不重複序號`))
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
              >
                <Select
                  mode="tags"
                  placeholder="掃描或輸入序號"
                  style={{ width: '100%' }}
                  tokenSeparators={[',', ' ', '\n']}
                  suffixIcon={<ScanOutlined />}
                />
              </Form.Item>
            ))}
          </>
        )}
      </Form>
    </Modal>
  )
}

export default FulfillOrderModal
