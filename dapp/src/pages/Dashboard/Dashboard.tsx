import { contractAddress } from 'config';
import { AuthRedirectWrapper } from 'wrappers';
import {
  Account,
  Transactions,
  NewSubscription
} from './widgets';
import { useScrollToElement } from 'hooks';
import { Widget } from './components';
import { WidgetType } from 'types/widget.types';
import { Subscriptions } from './widgets/Subscriptions';

const WIDGETS: WidgetType[] = [
  {
    title: 'Add a new subscription',
    widget: NewSubscription,
    description:
      'Schedule a new recurring payment',
    reference:
      '',
  },
  {
    title: 'Current subscriptions',
    widget: Subscriptions,
    props: { receiver: contractAddress },
    description: 'List of your current subscriptions',
    reference:
      ''
  },
  {
    title: 'Transactions History (PaySystem)',
    widget: Transactions,
    props: { receiver: contractAddress },
    description: 'List of last paid subscriptions',
    reference:
      'https://api.elrond.com/#/accounts/AccountController_getAccountTransactions'
  },
  {
    title: 'Account',
    widget: Account,
    description: 'Connected account details',
    reference: 'https://docs.multiversx.com/sdk-and-tools/sdk-dapp/#account'
  },
];

export const Dashboard = () => {
  useScrollToElement();

  return (
    <AuthRedirectWrapper>
      <div className='flex flex-col gap-6 max-w-3xl w-full'>
        {WIDGETS.map((element) => (
          <Widget key={element.title} {...element} />
        ))}
      </div>
    </AuthRedirectWrapper>
  );
};
