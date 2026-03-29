import { FormEvent, useState } from 'react'
import { FiPlus, FiX } from 'react-icons/fi'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Button } from './ui/button'
import { Input } from './ui/input'
import LoadingPair from './LoadingPair'
import Modal from './Modal'
import Tooltip from './Tooltip'

const categories = ['DeFi', 'DAO', 'NFT', 'Tooling', 'Infra', 'Web Development']

interface SubmitProjectFormProps {
  openModal: boolean
  closeModal: () => void
}

export default function SubmitProjectForm({ openModal, closeModal }: SubmitProjectFormProps) {
  const { isConnected, userInfo } = useUnifiedWallet()
  const { addProject, refreshProjects } = useProjects()
  const [githubUrls, setGithubUrls] = useState<string[]>([''])
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    category: 'DeFi',
  })
  const [message, setMessage] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormState({ name: '', description: '', category: 'DeFi' })
    setGithubUrls([''])
    setMessage('')
  }

  const handleClose = () => {
    resetForm()
    closeModal()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const repoUrls = githubUrls.map((url) => url.trim()).filter(Boolean)

    if (repoUrls.length === 0) {
      setMessage('Please add at least one GitHub repository URL')
      setIsSubmitting(false)
      return
    }

    if (!isConnected || !userInfo?.email) {
      setMessage('Please connect your account to create a project')
      setIsSubmitting(false)
      return
    }

    try {
      await addProject({
        name: formState.name,
        description: formState.description || undefined,
        category: formState.category,
        repoUrls,
        creator: userInfo.email,
      })

      setMessage('Project submitted successfully!')
      resetForm()
      await refreshProjects()
      setTimeout(() => { handleClose() }, 1500)
    } catch (error) {
      console.error('Failed to create project:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to create project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateGithubUrl = (index: number, value: string) => {
    const next = [...githubUrls]
    next[index] = value
    setGithubUrls(next)
  }

  const removeGithubUrl = (index: number) => {
    if (githubUrls.length > 1) {
      setGithubUrls(githubUrls.filter((_, i) => i !== index))
    }
  }

  const addGithubField = () => setGithubUrls((current) => [...current, ''])

  if (!openModal) return null

  return (
    <Modal
      open={openModal}
      onClose={handleClose}
      title="Submit Project"
      panelClassName="max-w-lg max-h-[90vh] overflow-y-auto"
      icon={<FiPlus className="w-4 h-4 text-accent" />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Name *</label>
            <Input
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="My Awesome Project"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Category *</label>
            <select
              className="flex h-9 w-full rounded-md border border-border-default bg-bg-elevated px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
              value={formState.category}
              onChange={(e) => setFormState({ ...formState, category: e.target.value })}
              disabled={isSubmitting}
            >
              {categories.map((option) => (
                <option key={option} value={option} className="bg-bg-elevated">
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Description</label>
          <textarea
            className="flex w-full rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 resize-none"
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            placeholder="What does your project do?"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">GitHub Repository URLs</span>
            <Tooltip text="Add one or more GitHub repositories. The API will automatically fetch metadata and contributors." />
          </div>
          {githubUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => updateGithubUrl(index, e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={isSubmitting}
              />
              {githubUrls.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeGithubUrl(index)} disabled={isSubmitting}>
                  <FiX className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={addGithubField} disabled={isSubmitting}>
            <FiPlus className="w-4 h-4" />
            Add another repo
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? <LoadingPair size="sm" label="Submitting..." /> : 'Submit Project'}
        </Button>

        {message && (
          <div className={`rounded-md border p-3 text-sm ${
            message.includes('success')
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}>
            {message}
          </div>
        )}
      </form>
    </Modal>
  )
}
