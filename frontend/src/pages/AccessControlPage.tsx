import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { useAuth } from '../contexts/AuthContext'
import { usersService, CreateUserPayload, UpdateUserPayload } from '../services/users.service'
import { rolesService, CreateRolePayload, UpdateRolePayload } from '../services/roles.service'
import { permissionsService } from '../services/permissions.service'
import { ManagedUser, PaginatedResult, Permission, Role, RolePermissionLink, UserRoleLink } from '../types'

type TableColumn<T> = {
  title: React.ReactNode
  dataIndex?: string
  key: string
  render?: (value: unknown, record: T) => React.ReactNode
}

type SimplePagination = {
  current?: number
}

const { Title, Text } = Typography

type UsersTabProps = {
  availableRoles: Role[]
}

type RolesTabProps = {
  roles: Role[]
  permissions: Permission[]
  loadingRoles: boolean
  loadingPermissions: boolean
  reloadRoles: () => Promise<void>
  reloadPermissions: () => Promise<void>
}

type PermissionsTabProps = {
  permissions: Permission[]
  loading: boolean
  reloadPermissions: () => Promise<void>
  reloadRoles: () => Promise<void>
}

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const withResponse = error as { response?: { data?: { message?: string } } }
    const responseMessage = withResponse.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }

    const withMessage = error as { message?: string }
    if (typeof withMessage.message === 'string' && withMessage.message.trim()) {
      return withMessage.message
    }
  }

  return '操作失敗，請稍後再試'
}

const UsersTab = ({ availableRoles }: UsersTabProps) => {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [meta, setMeta] = useState<PaginatedResult<ManagedUser>['meta']>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)

  const [createForm] = Form.useForm<CreateUserPayload>()
  const [assignForm] = Form.useForm<{ roleIds: string[] }>()
  const [editForm] = Form.useForm<UpdateUserPayload & { password?: string }>()

  const fetchUsers = useCallback(
    async (page = 1, limit = meta.limit) => {
      setLoading(true)
      try {
        const result = await usersService.list(page, limit)
        setUsers(result.items)
        setMeta(result.meta)
      } catch (error) {
        message.error(getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    },
    [meta.limit],
  )

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      await usersService.create(values)
      message.success('使用者建立成功')
      setCreateOpen(false)
      createForm.resetFields()
      fetchUsers(meta.page)
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const handleAssignRoles = async () => {
    if (!selectedUser) return
    try {
      const values = await assignForm.validateFields()
      await usersService.setRoles(selectedUser.id, values.roleIds ?? [])
      message.success('角色已更新')
      setAssignOpen(false)
      fetchUsers(meta.page)
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return
    try {
      const values = await editForm.validateFields()
      const payload: UpdateUserPayload = {
        name: values.name,
        isActive: values.isActive,
      }

      if (values.password) {
        payload.password = values.password
      }

      await usersService.update(selectedUser.id, payload)
      message.success('使用者資料已更新')
      setEditOpen(false)
      fetchUsers(meta.page)
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const toggleActive = async (record: ManagedUser, isActive: boolean) => {
    try {
      await usersService.update(record.id, { isActive })
      message.success(isActive ? '使用者已啟用' : '使用者已停用')
      fetchUsers(meta.page)
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const columns: TableColumn<ManagedUser>[] = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '電子郵件', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      key: 'roles',
      render: (_value: unknown, record: ManagedUser) => (
        <Space wrap>
          {record.roles?.map((userRole: UserRoleLink) => (
            <Tag key={userRole.roleId}>{userRole.role?.name || userRole.role?.code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'isActive',
      key: 'status',
      render: (_value: unknown, record: ManagedUser) => (
        <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? '啟用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value: unknown, record: ManagedUser) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => {
              setSelectedUser(record)
              assignForm.setFieldsValue({
                roleIds: record.roles?.map((link: UserRoleLink) => link.roleId) || [],
              })
              setAssignOpen(true)
            }}
          >
            設定角色
          </Button>
          <Button
            type="link"
            onClick={() => {
              setSelectedUser(record)
              editForm.setFieldsValue({
                name: record.name,
                isActive: record.isActive,
                password: undefined,
              })
              setEditOpen(true)
            }}
          >
            編輯
          </Button>
          {record.isActive ? (
            <Popconfirm
              title="確認停用此使用者？"
              onConfirm={() => toggleActive(record, false)}
            >
              <Button type="link" danger>
                停用
              </Button>
            </Popconfirm>
          ) : (
            <Button type="link" onClick={() => toggleActive(record, true)}>
              啟用
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card bordered={false} className="shadow-sm">
      <Space style={{ width: '100%', marginBottom: 16, justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            使用者管理
          </Title>
          <Text type="secondary">新增、停用或調整使用者角色</Text>
        </div>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新增使用者
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        scroll={{ x: 800 }}
        pagination={{
          current: meta.page,
          pageSize: meta.limit,
          total: meta.total,
          showSizeChanger: false,
        }}
        onChange={(pagination: SimplePagination) => {
          const currentPage = pagination.current ?? 1
          fetchUsers(currentPage)
        }}
      />

      <Modal
        title="新增使用者"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        destroyOnClose
        okText="建立"
      >
        <Form layout="vertical" form={createForm} initialValues={{ roleIds: [] }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '請輸入姓名' }]}>
            <Input placeholder="輸入使用者姓名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="電子郵件"
            rules={[{ required: true, message: '請輸入電子郵件' }, { type: 'email', message: '電子郵件格式不正確' }]}
          >
            <Input placeholder="例如 user@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="初始密碼"
            rules={[{ required: true, message: '請輸入密碼' }, { min: 8, message: '密碼至少 8 碼' }]}
          >
            <Input.Password placeholder="至少 8 碼" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="roleIds" label="指派角色">
            <Select
              mode="multiple"
              placeholder="選擇角色"
              options={availableRoles.map((role: Role) => ({
                label: role.name || role.code,
                value: role.id,
              }))}
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="設定角色"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssignRoles}
        okText="儲存"
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="roleIds" label="角色">
            <Select
              mode="multiple"
              placeholder="選擇角色"
              options={availableRoles.map((role: Role) => ({
                label: role.name || role.code,
                value: role.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="編輯使用者"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditUser}
        okText="儲存"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '請輸入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="帳號狀態" valuePropName="checked">
            <Switch checkedChildren="啟用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item
            name="password"
            label="重設密碼"
            rules={[{ min: 8, message: '密碼至少 8 碼' }]}
            extra="若不需變更密碼，請留白"
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

const RolesTab = ({
  roles,
  permissions,
  loadingRoles,
  loadingPermissions,
  reloadRoles,
  reloadPermissions,
}: RolesTabProps) => {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [permissionOpen, setPermissionOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const [createForm] = Form.useForm<CreateRolePayload>()
  const [editForm] = Form.useForm<UpdateRolePayload>()
  const [permissionsForm] = Form.useForm<{ permissionIds: string[] }>()

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      await rolesService.create(values)
      message.success('角色建立成功')
      setCreateOpen(false)
      createForm.resetFields()
      await reloadRoles()
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const handleUpdate = async () => {
    if (!selectedRole) return
    try {
      const values = await editForm.validateFields()
      await rolesService.update(selectedRole.id, values)
      message.success('角色已更新')
      setEditOpen(false)
      await reloadRoles()
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const handleDelete = async (role: Role) => {
    try {
      await rolesService.remove(role.id)
      message.success('角色已刪除')
      await reloadRoles()
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const handleSetPermissions = async () => {
    if (!selectedRole) return
    try {
      const values = await permissionsForm.validateFields()
      await rolesService.setPermissions(selectedRole.id, values.permissionIds ?? [])
      message.success('角色權限已更新')
      setPermissionOpen(false)
      await reloadRoles()
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const permissionOptions = useMemo(
    () =>
      permissions.map((permission: Permission) => ({
        label: `${permission.resource}:${permission.action}`,
        value: permission.id,
      })),
    [permissions],
  )

  const columns: TableColumn<Role>[] = [
    { title: '代碼', dataIndex: 'code', key: 'code' },
    { title: '名稱', dataIndex: 'name', key: 'name' },
    {
      title: '階層',
      dataIndex: 'hierarchyLevel',
      key: 'hierarchyLevel',
      render: (value: unknown) => (typeof value === 'number' ? value : '—'),
    },
    {
      title: '權限數量',
      key: 'permissionCount',
      render: (_value: unknown, record: Role) => record.permissions?.length ?? 0,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value: unknown, record: Role) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => {
              setSelectedRole(record)
              editForm.setFieldsValue({
                code: record.code,
                name: record.name,
                description: record.description,
                hierarchyLevel: record.hierarchyLevel,
              })
              setEditOpen(true)
            }}
          >
            編輯
          </Button>
          <Button
            type="link"
            onClick={() => {
              setSelectedRole(record)
              permissionsForm.setFieldsValue({
                permissionIds:
                  record.permissions?.map((item: RolePermissionLink) => item.permissionId) || [],
              })
              setPermissionOpen(true)
            }}
          >
            設定權限
          </Button>
          <Popconfirm
            title="確認刪除此角色？"
            onConfirm={() => handleDelete(record)
            }
            disabled={record.code === 'SUPER_ADMIN'}
          >
            <Button type="link" danger disabled={record.code === 'SUPER_ADMIN'}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card bordered={false} className="shadow-sm">
      <Space style={{ width: '100%', marginBottom: 16, justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            角色管理
          </Title>
          <Text type="secondary">建立角色並維護對應權限</Text>
        </div>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新增角色
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={roles}
        loading={loadingRoles}
        scroll={{ x: 800 }}
        pagination={false}
      />

      <Modal
        title="新增角色"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="建立"
      >
        <Form layout="vertical" form={createForm}>
          <Form.Item
            name="code"
            label="角色代碼"
            rules={[{ required: true, message: '請輸入角色代碼' }, { pattern: /^[A-Z_]+$/, message: '僅允許大寫英文字與底線' }]}
          >
            <Input placeholder="例如 FINANCE_ADMIN" />
          </Form.Item>
          <Form.Item name="name" label="角色名稱" rules={[{ required: true, message: '請輸入角色名稱' }]}>
            <Input placeholder="顯示名稱" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="簡短說明" />
          </Form.Item>
          <Form.Item name="hierarchyLevel" label="階層 (數字愈小代表權限愈高)">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="預設為 3" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="編輯角色"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleUpdate}
        okText="儲存"
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item
            name="code"
            label="角色代碼"
            rules={[{ required: true, message: '請輸入角色代碼' }, { pattern: /^[A-Z_]+$/, message: '僅允許大寫英文字與底線' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="name" label="角色名稱" rules={[{ required: true, message: '請輸入角色名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="hierarchyLevel" label="階層">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="預設為 3" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="設定角色權限"
        open={permissionOpen}
        onCancel={() => setPermissionOpen(false)}
        onOk={handleSetPermissions}
        okText="儲存"
        confirmLoading={loadingPermissions}
      >
        <Form form={permissionsForm} layout="vertical">
          <Form.Item name="permissionIds" label="權限列表">
            <Select
              mode="multiple"
              placeholder="選擇權限"
              options={permissionOptions}
              loading={loadingPermissions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

const PermissionsTab = ({
  permissions,
  loading,
  reloadPermissions,
  reloadRoles,
}: PermissionsTabProps) => {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)

  const [createForm] = Form.useForm<{ resource: string; action: string; description?: string }>()
  const [editForm] = Form.useForm<{ resource?: string; action?: string; description?: string }>()

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      await permissionsService.create(values)
      message.success('權限建立成功')
      setCreateOpen(false)
      createForm.resetFields()
      await reloadPermissions()
      await reloadRoles()
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const handleUpdate = async () => {
    if (!selectedPermission) return
    try {
      const values = await editForm.validateFields()
      await permissionsService.update(selectedPermission.id, values)
      message.success('權限已更新')
      setEditOpen(false)
      await reloadPermissions()
      await reloadRoles()
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        return
      }
      message.error(getErrorMessage(error))
    }
  }

  const handleDelete = async (record: Permission) => {
    try {
      await permissionsService.remove(record.id)
      message.success('權限已刪除')
      await reloadPermissions()
      await reloadRoles()
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const columns: TableColumn<Permission>[] = [
    { title: '資源', dataIndex: 'resource', key: 'resource' },
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'actions',
      render: (_value: unknown, record: Permission) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => {
              setSelectedPermission(record)
              editForm.setFieldsValue({
                resource: record.resource,
                action: record.action,
                description: record.description,
              })
              setEditOpen(true)
            }}
          >
            編輯
          </Button>
          <Popconfirm title="確認刪除此權限？" onConfirm={() => handleDelete(record)}>
            <Button type="link" danger>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card bordered={false} className="shadow-sm">
      <Space style={{ width: '100%', marginBottom: 16, justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            權限管理
          </Title>
          <Text type="secondary">維護資源／操作清單</Text>
        </div>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新增權限
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={permissions}
        loading={loading}
        scroll={{ x: 800 }}
        pagination={false}
      />pagination={false}
      />

      <Modal
        title="新增權限"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="建立"
      >
        <Form layout="vertical" form={createForm}>
          <Form.Item name="resource" label="資源" rules={[{ required: true, message: '請輸入資源名稱' }]}>
            <Input placeholder="例如 users" />
          </Form.Item>
          <Form.Item name="action" label="操作" rules={[{ required: true, message: '請輸入操作名稱' }]}>
            <Input placeholder="例如 create" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可選" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="編輯權限"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleUpdate}
        okText="儲存"
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="resource" label="資源" rules={[{ required: true, message: '請輸入資源名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="action" label="操作" rules={[{ required: true, message: '請輸入操作名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

const AccessControlPage: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.roles?.some((role: string) => role === 'SUPER_ADMIN' || role === 'ADMIN')

  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(false)

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true)
    try {
      const data = await rolesService.list()
      setRoles(data)
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoadingRoles(false)
    }
  }, [])

  const loadPermissions = useCallback(async () => {
    setLoadingPermissions(true)
    try {
      const data = await permissionsService.list()
      setPermissions(data)
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoadingPermissions(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadRoles()
      loadPermissions()
    }
  }, [isAdmin, loadRoles, loadPermissions])

  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="沒有權限"
        subTitle="請聯絡系統管理員以取得帳號／權限。"
      />
    )
  }

  return (
    <div className="p-6 space-y-4">
      <Title level={3}>帳號與權限管理</Title>
      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: '使用者',
            children: <UsersTab availableRoles={roles} />,
          },
          {
            key: 'roles',
            label: '角色',
            children: (
              <RolesTab
                roles={roles}
                permissions={permissions}
                loadingRoles={loadingRoles}
                loadingPermissions={loadingPermissions}
                reloadRoles={loadRoles}
                reloadPermissions={loadPermissions}
              />
            ),
          },
          {
            key: 'permissions',
            label: '權限',
            children: (
              <PermissionsTab
                permissions={permissions}
                loading={loadingPermissions}
                reloadPermissions={loadPermissions}
                reloadRoles={loadRoles}
              />
            ),
          },
        ]}
      />
    </div>
  )
}

export default AccessControlPage
