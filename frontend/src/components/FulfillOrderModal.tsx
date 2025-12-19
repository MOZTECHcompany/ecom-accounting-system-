import React, { useState, useEffect } from 'react'
import { Modal, Form, Select, Input, Button, message, Typography, List, Tag, Space } from 'antd'
import { SalesOrder, salesService } from '../services/sales.service'
import { inventoryService } from '../services/inventory.service'
import { ScanOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

interface FulfillOrderModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  order: SalesOrder
}

const FulfillOrderModal: React.FC<FulfillOrderModalProps> = ({ open, onClose, onSuccess, order }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      fetchWarehouses()
      form.resetFields()
    }
  }, [open])

  const fetchWarehouses = async () => {
    try {
      const entityId = localStorage.getItem('entityId') || 'default-entity-id' 
      const data = await inventoryService.getWarehouses(entityId)
      setWarehouses(data)
      if (data.length > 0) {
        form.setFieldValue('warehouseId', data[0].id)
      }
    } catch (error) {
      console.error(error)
      // message.error('Failed to load warehouses')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const entityId = localStorage.getItem('entityId') || 'default-entity-id'
      
      const itemSerialNumbers: Record<string, string[]> = {}
      
      order.items?.forEach((item: any) => {
        if (item.product.hasSerialNumbers) {
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

      message.success('Order fulfilled successfully')
      onSuccess()
      onClose()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to fulfill order')
    } finally {
      setLoading(false)
    }
  }

  const snItems = order.items?.filter((item: any) => item.product.hasSerialNumbers) || []

  return (
    <Modal
      title="Fulfill Order"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item 
          name="warehouseId" 
          label="Warehouse" 
          rules={[{ required: true, message: 'Please select a warehouse' }]}
        >
          <Select>
            {warehouses.map(w => (
              <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {snItems.length > 0 && (
          <>
            <Title level={5}>Serial Numbers Required</Title>
            {snItems.map((item: any) => (
              <Form.Item
                key={item.id}
                name={item.id}
                label={`${item.product.name} (Qty: ${item.qty})`}
                rules={[
                  { required: true, message: 'Please enter serial numbers' },
                  { 
                    validator: (_, value) => {
                      if (!value || value.length !== Number(item.qty)) {
                        return Promise.reject(`Please select exactly ${item.qty} serial numbers`)
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
              >
                <Select
                  mode="tags"
                  placeholder="Scan or enter serial numbers"
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
