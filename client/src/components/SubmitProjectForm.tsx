import { FormEvent, useState } from 'react'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
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
      // Reset form
      resetForm()
      // Refresh the projects list
      await refreshProjects()
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        handleClose()
      }, 1500)
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
      icon={
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-black">Name *</span>
            <input
              required
              className="input-field"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="My Awesome Project"
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-black">Category *</span>
            <select
              className="input-field"
              value={formState.category}
              onChange={(e) => setFormState({ ...formState, category: e.target.value })}
              disabled={isSubmitting}
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-black">Description</span>
          <textarea
            className="input-field resize-none"
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            placeholder="What does your project do?"
            rows={3}
            disabled={isSubmitting}
          />
        </label>

        <div className="space-y-3">
          <span className="text-sm font-medium text-black">
            GitHub Repository URLs
            <Tooltip text="Add one or more GitHub repositories. The API will automatically fetch metadata and contributors.">
              <span className="ml-2 inline-flex h-4 w-4 items-center justify-center border border-black text-[10px]">?</span>
            </Tooltip>
          </span>
          {githubUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="input-field flex-1"
                value={url}
                onChange={(e) => updateGithubUrl(index, e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={isSubmitting}
              />
              {githubUrls.length > 1 && (
                <button type="button" onClick={() => removeGithubUrl(index)} className="btn-secondary px-3" disabled={isSubmitting}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addGithubField} className="btn-secondary text-sm flex items-center gap-2" disabled={isSubmitting}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add another repo
          </button>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? <LoadingPair size="sm" label="Submitting..." /> : 'Submit Project'}
        </button>

        {message && (
          <div
            className={`p-3 border-2 border-black text-sm ${
              message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </Modal>
  )
}
