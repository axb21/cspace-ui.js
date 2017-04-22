import React, { Component, PropTypes } from 'react';
import { defineMessages, injectIntl, intlShape, FormattedMessage } from 'react-intl';
import Immutable from 'immutable';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import { Modal } from 'cspace-layout';
import SearchForm from './SearchForm';
import Pager from './Pager';
import BackButton from '../record/BackButton';
import CancelButton from '../record/CancelButton';
import RelateButton from '../record/RelateButton';
import SearchButton from './SearchButton';
import SearchResultSummary from './SearchResultSummary';
import SearchToRelateTitleBar from './SearchToRelateTitleBar';
import SelectBar from './SelectBar';
import SearchResultTableContainer from '../../containers/search/SearchResultTableContainer';
import { normalizeCondition } from '../../helpers/searchHelpers';
import styles from '../../../styles/cspace-ui/SearchToRelateModal.css';

const messages = defineMessages({
  editSearch: {
    id: 'searchToRelateModal.editSearch',
    defaultMessage: 'Revise search',
  },
  label: {
    id: 'searchToRelateModal.label',
    defaultMessage: 'Search to Relate',
  },
  relate: {
    id: 'searchToRelateModal.relate',
    defaultMessage: 'Relate selected',
  },
  relating: {
    id: 'searchToRelateModal.relating',
    defaultMessage: 'Relating...',
  },
});

export const searchName = 'searchToRelate';

const listType = 'common';
// FIXME: Make default page size configurable
const defaultPageSize = 20;

const handleItemClick = () => false;

const propTypes = {
  config: PropTypes.object,
  intl: intlShape,
  isOpen: PropTypes.bool,
  keywordValue: PropTypes.string,
  defaultRecordTypeValue: PropTypes.string,
  recordTypeValue: PropTypes.string,
  vocabularyValue: PropTypes.string,
  advancedSearchCondition: PropTypes.object,
  preferredPageSize: PropTypes.number,
  selectedItems: PropTypes.instanceOf(Immutable.Map),
  subjectCsid: PropTypes.string,
  subjectRecordType: PropTypes.string,
  onAdvancedSearchConditionCommit: PropTypes.func,
  onKeywordCommit: PropTypes.func,
  onRecordTypeCommit: PropTypes.func,
  onVocabularyCommit: PropTypes.func,
  onCloseButtonClick: PropTypes.func,
  onCancelButtonClick: PropTypes.func,
  onItemSelectChange: PropTypes.func,
  onRelationsCreated: PropTypes.func,
  clearSearchResults: PropTypes.func,
  createRelations: PropTypes.func,
  parentSelector: PropTypes.func,
  search: PropTypes.func,
  setPreferredPageSize: PropTypes.func,
};

const defaultProps = {
  selectedItems: Immutable.Map(),
};

export class BaseSearchToRelateModal extends Component {
  constructor() {
    super();

    this.handleAcceptButtonClick = this.handleAcceptButtonClick.bind(this);
    this.handleCancelButtonClick = this.handleCancelButtonClick.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
    this.handleCloseButtonClick = this.handleCloseButtonClick.bind(this);
    this.handleEditSearchLinkClick = this.handleEditSearchLinkClick.bind(this);
    this.handleFormSearch = this.handleFormSearch.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePageSizeChange = this.handlePageSizeChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.renderCheckbox = this.renderCheckbox.bind(this);
    this.renderEditSearchLink = this.renderEditSearchLink.bind(this);
    this.renderModalButtonBar = this.renderModalButtonBar.bind(this);
    this.renderSearchResultTableHeader = this.renderSearchResultTableHeader.bind(this);
    this.renderSearchResultTableFooter = this.renderSearchResultTableFooter.bind(this);

    this.state = {
      isSearchInitiated: false,
      pageNum: 0,
      sort: null,
    };
  }

  componentWillReceiveProps(nextProps) {
    const {
      isOpen,
    } = this.props;

    const {
      isOpen: nextIsOpen,
    } = nextProps;

    if (isOpen && !nextIsOpen) {
      // Closing.

      this.setState({
        isRelating: false,
        isSearchInitiated: false,
        pageNum: 0,
        sort: null,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      isOpen,
    } = this.props;

    const {
      isOpen: prevIsOpen,
    } = prevProps;

    if (prevIsOpen && !isOpen) {
      // Closed.

      const {
        clearSearchResults,
        onRecordTypeCommit,
      } = this.props;

      if (clearSearchResults) {
        clearSearchResults(searchName);
      }

      if (onRecordTypeCommit) {
        onRecordTypeCommit('');
      }
    } else if (!prevIsOpen && isOpen) {
      // Opened.

      const {
        defaultRecordTypeValue,
        onRecordTypeCommit,
      } = this.props;

      if (onRecordTypeCommit) {
        onRecordTypeCommit(defaultRecordTypeValue);

        // TODO: If search to relate is ever used on authorities, need to set the default vocabulary
        // if this is an authority record type, and vocabularyValue is not provided.
      }
    }

    const {
      isSearchInitiated,
      pageNum,
      sort,
    } = this.state;

    if (isSearchInitiated) {
      const {
        recordTypeValue,
        vocabularyValue,
        advancedSearchCondition,
        preferredPageSize,
      } = this.props;

      const {
        recordTypeValue: prevRecordTypeValue,
        vocabularyValue: prevVocabularyValue,
        advancedSearchCondition: prevAdvancedSearchCondition,
        preferredPageSize: prevPreferredPageSize,
      } = prevProps;

      const {
        pageNum: prevPageNum,
        sort: prevSort,
      } = prevState;

      if (
        recordTypeValue !== prevRecordTypeValue ||
        vocabularyValue !== prevVocabularyValue ||
        !isEqual(advancedSearchCondition, prevAdvancedSearchCondition) ||
        preferredPageSize !== prevPreferredPageSize ||
        pageNum !== prevPageNum ||
        sort !== prevSort
      ) {
        this.search();
      }
    }
  }

  getSearchDescriptor() {
    const {
      config,
      recordTypeValue: recordType,
      vocabularyValue: vocabulary,
      keywordValue: keyword,
      advancedSearchCondition,
      preferredPageSize,
      subjectCsid,
    } = this.props;

    const {
      pageNum,
      sort,
    } = this.state;

    const pageSize = preferredPageSize || defaultPageSize;

    const searchQuery = {
      mkRtSbj: subjectCsid,
      p: pageNum,
      size: pageSize,
    };

    if (sort) {
      searchQuery.sort = sort;
    }

    const kw = keyword ? keyword.trim() : '';

    if (kw) {
      searchQuery.kw = kw;
    }

    const fields = get(config, ['recordTypes', recordType, 'fields']);
    const condition = normalizeCondition(fields, advancedSearchCondition);

    if (condition) {
      searchQuery.as = condition;
    }

    return {
      recordType,
      vocabulary,
      searchQuery,
    };
  }

  relate() {
    const {
      selectedItems,
      subjectCsid,
      subjectRecordType,
      createRelations,
      onRelationsCreated,
    } = this.props;

    if (createRelations) {
      const searchDescriptor = this.getSearchDescriptor();

      this.setState({
        isRelating: true,
        isSearchInitiated: false,
      });

      const subject = {
        csid: subjectCsid,
        type: subjectRecordType,
      };

      const objects = selectedItems.valueSeq().map(item => ({
        csid: item.get('csid'),
        type: searchDescriptor.recordType, // TODO: Check the item's docType first
      })).toJS();

      createRelations(subject, objects, 'affects')
        .then(() => {
          if (onRelationsCreated) {
            onRelationsCreated();
          }
        });
    }
  }

  search() {
    const {
      config,
      search,
    } = this.props;

    if (search) {
      const searchDescriptor = this.getSearchDescriptor();

      search(config, searchName, searchDescriptor);

      this.setState({
        isSearchInitiated: true,
      });
    }
  }

  handleAcceptButtonClick() {
    const {
      isSearchInitiated,
    } = this.state;

    if (isSearchInitiated) {
      this.relate();
    } else {
      this.search();
    }
  }

  handleCancelButtonClick(event) {
    const {
      onCancelButtonClick,
    } = this.props;

    if (onCancelButtonClick) {
      onCancelButtonClick(event);
    }
  }

  handleCloseButtonClick(event) {
    const {
      onCloseButtonClick,
    } = this.props;

    if (onCloseButtonClick) {
      onCloseButtonClick(event);
    }
  }

  handleEditSearchLinkClick() {
    const {
      clearSearchResults,
    } = this.props;

    if (clearSearchResults) {
      clearSearchResults(searchName);
    }

    this.setState({
      isSearchInitiated: false,
    });
  }

  handleFormSearch() {
    this.search();
  }

  handleCheckboxChange(event) {
    const checkbox = event.target;
    const index = parseInt(checkbox.name, 10);
    const checked = checkbox.checked;

    const {
      config,
      onItemSelectChange,
    } = this.props;

    if (onItemSelectChange) {
      const searchDescriptor = this.getSearchDescriptor();

      onItemSelectChange(config, searchName, searchDescriptor, listType, index, checked);
    }
  }

  handlePageChange(pageNum) {
    this.setState({
      pageNum,
    });
  }

  handlePageSizeChange(pageSize) {
    const {
      setPreferredPageSize,
    } = this.props;

    let normalizedPageSize;

    if (isNaN(pageSize) || pageSize < 1) {
      normalizedPageSize = 0;
    } else if (pageSize > 2500) {
      normalizedPageSize = 2500;
    } else {
      normalizedPageSize = pageSize;
    }

    if (setPreferredPageSize) {
      this.setState({
        pageNum: 0,
      });

      setPreferredPageSize(normalizedPageSize);
    }
  }

  handleSortChange(sort) {
    this.setState({
      sort,
    });
  }

  renderCheckbox({ rowData, rowIndex }) {
    const {
      subjectCsid,
      selectedItems,
    } = this.props;

    if (rowData.get('related') === 'true') {
      return null;
    }

    const itemCsid = rowData.get('csid');

    if (itemCsid === subjectCsid) {
      return null;
    }

    const selected = selectedItems ? selectedItems.has(itemCsid) : false;

    return (
      <input
        checked={selected}
        name={rowIndex}
        type="checkbox"
        onChange={this.handleCheckboxChange}
      />
    );
  }

  renderSearchForm() {
    const {
      config,
      defaultRecordTypeValue,
      intl,
      keywordValue,
      recordTypeValue,
      vocabularyValue,
      advancedSearchCondition,
      onAdvancedSearchConditionCommit,
      onKeywordCommit,
      onRecordTypeCommit,
      onVocabularyCommit,
    } = this.props;

    const defaultServiceType =
      get(config, ['recordTypes', defaultRecordTypeValue, 'serviceConfig', 'serviceType']);

    let recordTypeInputReadOnly = true;
    let recordTypeInputRootType;
    let recordTypeInputServiceTypes;

    if (defaultServiceType === 'utility') {
      // The default record type is object, authority, procedure, or another service type.
      // Allow the record type to be changed.

      recordTypeInputReadOnly = false;

      // Don't show the All Records option.

      recordTypeInputRootType = '';

      // Only show record types where the serviceType is the default record type.

      recordTypeInputServiceTypes = [defaultRecordTypeValue];
    }

    return (
      <SearchForm
        config={config}
        intl={intl}
        recordTypeValue={recordTypeValue}
        vocabularyValue={vocabularyValue}
        keywordValue={keywordValue}
        advancedSearchCondition={advancedSearchCondition}
        recordTypeInputReadOnly={recordTypeInputReadOnly}
        recordTypeInputRootType={recordTypeInputRootType}
        recordTypeInputServiceTypes={recordTypeInputServiceTypes}
        onAdvancedSearchConditionCommit={onAdvancedSearchConditionCommit}
        onKeywordCommit={onKeywordCommit}
        onRecordTypeCommit={onRecordTypeCommit}
        onVocabularyCommit={onVocabularyCommit}
        onSearch={this.handleFormSearch}
      />
    );
  }

  renderEditSearchLink() {
    return (
      <button onClick={this.handleEditSearchLinkClick}>
        <FormattedMessage {...messages.editSearch} />
      </button>
    );
  }

  renderSearchResultTableHeader({ searchError, searchResult }) {
    const {
      config,
      selectedItems,
    } = this.props;

    const selectedCount = selectedItems ? selectedItems.size : 0;

    return (
      <header>
        <SearchResultSummary
          config={config}
          listType={listType}
          searchDescriptor={this.getSearchDescriptor()}
          searchError={searchError}
          searchResult={searchResult}
          renderEditLink={this.renderEditSearchLink}
          onPageSizeChange={this.handlePageSizeChange}
        />
        <SelectBar
          selectedCount={selectedCount}
        />
      </header>
    );
  }

  renderSearchResultTableFooter({ searchResult }) {
    const {
      config,
    } = this.props;

    if (searchResult) {
      const listTypeConfig = config.listTypes[listType];
      const list = searchResult.get(listTypeConfig.listNodeName);

      const totalItems = parseInt(list.get('totalItems'), 10);
      const pageSize = parseInt(list.get('pageSize'), 10);
      const pageNum = parseInt(list.get('pageNum'), 10);
      const lastPage = Math.max(0, isNaN(totalItems) ? 0 : Math.ceil(totalItems / pageSize) - 1);

      return (
        <footer>
          <Pager
            currentPage={pageNum}
            lastPage={lastPage}
            pageSize={pageSize}
            onPageChange={this.handlePageChange}
            onPageSizeChange={this.handlePageSizeChange}
          />
        </footer>
      );
    }

    return null;
  }

  renderSearchResultTable() {
    const {
      config,
      recordTypeValue,
    } = this.props;

    const searchDescriptor = this.getSearchDescriptor();

    return (
      <SearchResultTableContainer
        config={config}
        listType={listType}
        recordType={recordTypeValue}
        searchName={searchName}
        searchDescriptor={searchDescriptor}
        showCheckboxColumn
        renderCheckbox={this.renderCheckbox}
        renderHeader={this.renderSearchResultTableHeader}
        renderFooter={this.renderSearchResultTableFooter}
        onItemClick={handleItemClick}
        onSortChange={this.handleSortChange}
      />
    );
  }

  renderModalButtonBar() {
    const {
      selectedItems,
    } = this.props;

    const {
      isRelating,
      isSearchInitiated,
    } = this.state;

    const cancelButton = (
      <CancelButton
        disabled={isRelating}
        onClick={this.handleCancelButtonClick}
      />
    );

    let acceptButton;
    let backButton;

    if (isSearchInitiated) {
      acceptButton = (
        <RelateButton
          disabled={isRelating || !selectedItems || selectedItems.size < 1}
          label={<FormattedMessage {...messages.relate} />}
          onClick={this.handleAcceptButtonClick}
        />
      );

      backButton = (
        <BackButton
          disabled={isRelating}
          label={<FormattedMessage {...messages.editSearch} />}
          onClick={this.handleEditSearchLinkClick}
        />
      );
    } else {
      acceptButton = (
        <SearchButton
          disabled={isRelating}
          type="button"
          onClick={this.handleAcceptButtonClick}
        />
      );
    }

    return (
      <div>
        {cancelButton}
        {backButton}
        {acceptButton}
      </div>
    );
  }

  render() {
    const {
      config,
      intl,
      isOpen,
      recordTypeValue,
      parentSelector,
    } = this.props;

    const {
      isRelating,
      isSearchInitiated,
    } = this.state;

    let content;

    if (isRelating) {
      content = <p><FormattedMessage {...messages.relating} /></p>;
    } else if (isSearchInitiated) {
      content = this.renderSearchResultTable();
    } else {
      content = this.renderSearchForm();
    }

    const searchDescriptor = this.getSearchDescriptor();

    const title = (
      <SearchToRelateTitleBar
        config={config}
        isSearchInitiated={isSearchInitiated}
        recordType={recordTypeValue}
        searchDescriptor={searchDescriptor}
      />
    );

    return (
      <Modal
        className={styles.common}
        contentLabel={intl.formatMessage(messages.label)}
        title={title}
        isOpen={isOpen}
        showCloseButton={!isRelating}
        closeButtonClassName="material-icons"
        closeButtonLabel="close"
        parentSelector={parentSelector}
        renderButtonBar={this.renderModalButtonBar}
        onCloseButtonClick={this.handleCloseButtonClick}
      >
        {content}
      </Modal>
    );
  }
}

BaseSearchToRelateModal.propTypes = propTypes;
BaseSearchToRelateModal.defaultProps = defaultProps;

export default injectIntl(BaseSearchToRelateModal);