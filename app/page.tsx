'use client';
import { useState } from "react";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';

interface PreGoalFormData {
  user_id: string;
  pre_goal_data: string;
}

interface ValidatedGoalFormData {
  user_id: string;
  validated_goal: string;
}

interface GoalPlan {
  path: string;
  // Add other fields as needed
}

export default function Home() {
  const [preGoal, setPreGoal] = useState('');
  const [smartGoal, setSmartGoal] = useState('');
  const [goalPlan, setGoalPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'initial' | 'review' | 'final'>('initial');

  const handlePreGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('https://backend-65271787895.europe-west1.run.app/smart_goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "temp_user_id", // You should implement proper user management
          pre_goal_data: preGoal
        } as PreGoalFormData),
      });
      
      const data = await response.json();
      setSmartGoal(data);
      setStep('review');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalValidation = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('https://backend-65271787895.europe-west1.run.app/generate_milestones_and_tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "temp_user_id", // You should implement proper user management
          validated_goal: smartGoal
        } as ValidatedGoalFormData),
      });
      
      const data = await response.json();
      setGoalPlan(data);
      setStep('final');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <main className="space-y-8">
        <h1 className="text-3xl font-bold text-center">Goal Planning Assistant</h1>

        {step === 'initial' && (
          <form onSubmit={handlePreGoalSubmit} className="space-y-4">
            <div>
              <label htmlFor="preGoal" className="block text-sm font-medium mb-2">
                What is your goal?
              </label>
              <textarea
                id="preGoal"
                value={preGoal}
                onChange={(e) => setPreGoal(e.target.value)}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="Describe your goal..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? 'Processing...' : 'Generate SMART Goal'}
            </button>
          </form>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h2 className="text-xl font-semibold mb-2">Your SMART Goal:</h2>
              <p className="whitespace-pre-wrap">{smartGoal}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep('initial')}
                className="flex-1 p-2 border rounded-md hover:bg-gray-50"
              >
                Revise Goal
              </button>
              <button
                onClick={handleGoalValidation}
                disabled={isLoading}
                className="flex-1 bg-green-500 text-white p-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
              >
                {isLoading ? 'Processing...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        )}

        {step === 'final' && goalPlan && (
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-4">Your Goal Plan:</h2>
            <div className="p-4 bg-gray-50 rounded-md">
              <ReactMarkdown className="whitespace-pre-wrap">{goalPlan}</ReactMarkdown>
            </div>
            <button
              onClick={() => {
                setStep('initial');
                setPreGoal('');
                setSmartGoal('');
                setGoalPlan('');
              }}
              className="mt-4 w-full p-2 border rounded-md hover:bg-gray-50"
            >
              Start New Goal
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
