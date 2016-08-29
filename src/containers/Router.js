import { connect } from 'react-redux';

import { redirectLogin } from '../actions';
import { getUserUsername } from '../reducers';

import Router from '../components/Router';

const mapStateToProps = state => ({
  username: getUserUsername(state),
});

export default connect(
  mapStateToProps,
  { redirectLogin }
)(Router);
