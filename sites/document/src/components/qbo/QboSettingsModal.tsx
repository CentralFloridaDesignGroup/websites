import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Combobox } from 'cfdg/input'
import { Modal, showNotification } from 'cfdg/layout'
import { type QboAccount, type QboConnectionStatus, type QboServiceItem } from 'cfdg/scripts'
import { Link, RefreshCw } from 'lucide-react'
import {
  fetchQboAccounts,
  fetchQboServiceItems,
  fetchQboStatus,
  startQboConnection,
  syncQboAccounts,
  syncQboCustomers,
  syncQboServiceItems,
  updateQboSettings,
} from '../../api/qbo'

type QboSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

const disconnectedStatus: QboConnectionStatus = {
  connected: false,
  realmId: '',
  environment: '',
  lastCustomerSyncDate: '',
  lastItemSyncDate: '',
  lastAccountSyncDate: '',
  tokenExpiresDate: '',
  defaultServiceItemId: '',
  defaultServiceItemName: '',
  defaultDepositAccountId: '',
  defaultDepositAccountName: '',
  stripeFeeExpenseAccountId: '',
  stripeFeeExpenseAccountName: '',
}

export function QboSettingsModal({ isOpen, onClose }: QboSettingsModalProps) {
  const [qboStatus, setQboStatus] = useState<QboConnectionStatus | null>(null)
  const [qboServiceItems, setQboServiceItems] = useState<QboServiceItem[]>([])
  const [qboAccounts, setQboAccounts] = useState<QboAccount[]>([])
  const [qboBusy, setQboBusy] = useState(false)

  const qboDepositAccounts = useMemo(() => qboAccounts.filter((account) => ['Bank', 'Other Current Asset'].includes(account.accountType)), [qboAccounts])
  const qboFeeExpenseAccounts = useMemo(() => qboAccounts.filter((account) => ['Expense', 'Other Expense', 'Cost of Goods Sold'].includes(account.accountType)), [qboAccounts])

  const loadQboData = useCallback(async () => {
    try {
      const status = await fetchQboStatus()
      setQboStatus(status)
      if (status.connected) {
        const [serviceItems, accounts] = await Promise.all([
          fetchQboServiceItems(),
          fetchQboAccounts(),
        ])
        setQboServiceItems(serviceItems)
        setQboAccounts(accounts)
      } else {
        setQboServiceItems([])
        setQboAccounts([])
      }
    } catch {
      setQboStatus(disconnectedStatus)
      setQboServiceItems([])
      setQboAccounts([])
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadQboData()
    }
  }, [isOpen, loadQboData])

  async function connectQbo() {
    setQboBusy(true)
    try {
      const authorizationUrl = await startQboConnection()
      window.location.href = authorizationUrl
    } catch (error) {
      showNotification({ title: 'QBO Connection Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  async function syncCustomersFromQbo() {
    setQboBusy(true)
    try {
      const count = await syncQboCustomers()
      await loadQboData()
      showNotification({ title: 'QBO Customers Synced', body: `${count} customers refreshed.`, style: 'success' })
    } catch (error) {
      showNotification({ title: 'QBO Sync Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  async function syncServiceItemsFromQbo() {
    setQboBusy(true)
    try {
      const count = await syncQboServiceItems()
      await loadQboData()
      showNotification({ title: 'QBO Service Items Synced', body: `${count} service items refreshed.`, style: 'success' })
    } catch (error) {
      showNotification({ title: 'QBO Item Sync Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  async function syncAccountsFromQbo() {
    setQboBusy(true)
    try {
      const count = await syncQboAccounts()
      await loadQboData()
      showNotification({ title: 'QBO Accounts Synced', body: `${count} accounts refreshed.`, style: 'success' })
    } catch (error) {
      showNotification({ title: 'QBO Account Sync Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  async function selectDefaultQboServiceItem(serviceItemId: string) {
    setQboBusy(true)
    try {
      await updateQboSettings({ defaultServiceItemId: serviceItemId })
      await loadQboData()
      const item = qboServiceItems.find((entry) => entry.id === serviceItemId)
      showNotification({ title: 'QBO Service Item Set', body: item?.name || serviceItemId, style: 'success' })
    } catch (error) {
      showNotification({ title: 'QBO Setting Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  async function selectQboDepositAccount(accountId: string) {
    setQboBusy(true)
    try {
      await updateQboSettings({ defaultDepositAccountId: accountId })
      await loadQboData()
      const account = qboAccounts.find((entry) => entry.id === accountId)
      showNotification({ title: 'QBO Deposit Account Set', body: account?.name || accountId, style: 'success' })
    } catch (error) {
      showNotification({ title: 'QBO Setting Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  async function selectStripeFeeExpenseAccount(accountId: string) {
    setQboBusy(true)
    try {
      await updateQboSettings({ stripeFeeExpenseAccountId: accountId })
      await loadQboData()
      const account = qboAccounts.find((entry) => entry.id === accountId)
      showNotification({ title: 'Stripe Fee Account Set', body: account?.name || accountId, style: 'success' })
    } catch (error) {
      showNotification({ title: 'QBO Setting Failed', body: String(error), style: 'danger' })
    } finally {
      setQboBusy(false)
    }
  }

  return (
    <Modal
      title="QBO Settings"
      isOpen={isOpen}
      acceptText="Done"
      closeText="Close"
      size="xl"
      colorMode="auto"
      onAccept={onClose}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-semibold">{qboStatus?.connected ? 'QuickBooks is connected' : 'QuickBooks is not connected'}</p>
              <p className="text-gray-600 dark:text-gray-400">
                {qboStatus?.connected
                  && (
                    <>
                      <p>Environment: {qboStatus.environment || 'unknown'}</p>
                      {qboStatus.defaultServiceItemName && <p> Default service item: {qboStatus.defaultServiceItemName}</p>}
                    </>
                  )}
              </p>
            </div>
            <div className="flex flex-row justify-between flex-wrap gap-2">
              {qboStatus?.connected ? (
                <Button label="Sync Customers" style="secondary" icon={RefreshCw} onClick={() => void syncCustomersFromQbo()} properties={{ disabled: qboBusy }} />
              ) : (
                <Button label="Connect QBO" style="primary" icon={Link} onClick={() => void connectQbo()} properties={{ disabled: qboBusy }} />
              )}
              {qboStatus?.connected && <Button label="Sync Items" style="secondary" icon={RefreshCw} onClick={() => void syncServiceItemsFromQbo()} properties={{ disabled: qboBusy }} />}
              {qboStatus?.connected && <Button label="Sync Accounts" style="secondary" icon={RefreshCw} onClick={() => void syncAccountsFromQbo()} properties={{ disabled: qboBusy }} />}
            </div>
          </div>
        </div>

        {qboStatus?.connected && (
          <div className="grid grid-cols-1 gap-6">
            <Combobox
              field="qbo-default-service-item"
              label="QBO Invoice Service Item"
              colorMode="auto"
              selections={qboServiceItems.map((item) => ({ key: item.fullyQualifiedName || item.name, value: item.id }))}
              value={qboStatus.defaultServiceItemId}
              placeholder={qboServiceItems.length > 0 ? 'Select service item' : 'Sync service items first'}
              disabled={qboBusy || qboServiceItems.length === 0}
              onChange={(_, value) => void selectDefaultQboServiceItem(value)}
            />
            <Combobox
              field="qbo-default-deposit-account"
              label="QBO Payment Deposit Account"
              colorMode="auto"
              selections={qboDepositAccounts.map((account) => ({ key: `${account.name} (${account.accountType})`, value: account.id }))}
              value={qboStatus.defaultDepositAccountId}
              placeholder={qboDepositAccounts.length > 0 ? 'Select bank/deposit account' : 'Sync accounts first'}
              disabled={qboBusy || qboDepositAccounts.length === 0}
              onChange={(_, value) => void selectQboDepositAccount(value)}
            />
            <Combobox
              field="qbo-stripe-fee-account"
              label="Stripe Fee Expense Account"
              colorMode="auto"
              selections={qboFeeExpenseAccounts.map((account) => ({ key: `${account.name} (${account.accountType})`, value: account.id }))}
              value={qboStatus.stripeFeeExpenseAccountId}
              placeholder={qboFeeExpenseAccounts.length > 0 ? 'Select fee expense account' : 'Sync accounts first'}
              disabled={qboBusy || qboFeeExpenseAccounts.length === 0}
              onChange={(_, value) => void selectStripeFeeExpenseAccount(value)}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Stripe deposits and fee lines are created after payout reconciliation. Allow up to 48 hours after payout for QBO records to appear.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
