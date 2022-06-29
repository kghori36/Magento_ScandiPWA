/**
 * ScandiPWA - Progressive Web App for Magento
 *
 * Copyright © Scandiweb, Inc. All rights reserved.
 * See LICENSE for license details.
 *
 * @license OSL-3.0 (Open Software License ("OSL") v. 3.0)
 * @package scandipwa/base-theme
 * @link https://github.com/scandipwa/base-theme
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Subscribe } from 'unstated';

import {
    mapDispatchToProps as sourceMapDispatchToProps,
    mapStateToProps as sourceMapStateToProps,
    ProductContainer
} from 'Component/Product/Product.container';
import SharedTransitionContainer from 'Component/SharedTransition/SharedTransition.unstated';
import { GRID_LAYOUT } from 'Route/CategoryPage/CategoryPage.config';
import { showNotification } from 'Store/Notification/Notification.action';
import { FilterType } from 'Type/Category.type';
import { ChildrenType, MixType } from 'Type/Common.type';
import { LayoutType } from 'Type/Layout.type';
import history from '../../util/History';
import { getSmallImage } from '../../util/Product/Extract';
import { appendWithStoreCode, objectToUri } from '../../util/Url';
import {
    getVariantsIndexes,
    getNewParameters,
    getVariantIndex
} from '../../util/Product';
import ProductCard from './ProductCard.component';
import PRODUCT_TYPE from 'Component/Product/Product.config';
import { getProductInStock } from 'SourceUtil/Product/Extract';

export const CartDispatcher = import(
    /* webpackMode: "lazy", webpackChunkName: "dispatchers" */
    'Store/Cart/Cart.dispatcher'
    );

/** @namespace Component/ProductCard/Container/mapStateToProps */
export const mapStateToProps = (state) => ({
    ...sourceMapStateToProps(state),
    baseLinkUrl: state.ConfigReducer.base_link_url || '',
    productUsesCategories: state.ConfigReducer.product_use_categories || false,
    categoryUrlSuffix: state.ConfigReducer.category_url_suffix
});

/** @namespace Component/ProductCard/Container/mapDispatchToProps */
export const mapDispatchToProps = (dispatch) => ({
    ...sourceMapDispatchToProps(dispatch),
    showNotification: (type, message) => dispatch(showNotification(type, message))
});

/** @namespace Component/ProductCard/Container */
export class ProductCardContainer extends ProductContainer {
    static propTypes = {
        ...ProductContainer.propTypes,
        selectedFilters: FilterType,

        // Link building
        productUsesCategories: PropTypes.bool.isRequired,
        categoryUrlSuffix: PropTypes.string.isRequired,
        baseLinkUrl: PropTypes.string.isRequired,
        isWishlistEnabled: PropTypes.bool.isRequired,
        isPreview: PropTypes.bool,
        hideCompareButton: PropTypes.bool,
        hideWishlistButton: PropTypes.bool,
        isLoading: PropTypes.bool,

        renderContent: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
        showNotification: PropTypes.func.isRequired,
        siblingsHaveBrands: PropTypes.bool,
        setSiblingsHaveBrands: PropTypes.func,
        siblingsHavePriceBadge: PropTypes.bool,
        setSiblingsHavePriceBadge: PropTypes.func,
        siblingsHaveConfigurableOptions: PropTypes.bool,
        children: ChildrenType,
        mix: MixType,
        layout: LayoutType
    };

    static defaultProps = {
        ...ProductContainer.defaultProps,
        selectedFilters: {},
        hideWishlistButton: false,
        hideCompareButton: false,
        renderContent: false,
        isLoading: false,
        children: null,
        mix: {},
        isPreview: false,
        siblingsHaveBrands: false,
        setSiblingsHaveBrands: () => null,
        siblingsHavePriceBadge: false,
        setSiblingsHavePriceBadge: () => null,
        siblingsHaveConfigurableOptions: false,
        layout: GRID_LAYOUT
    };




    containerFunctions = {
        getAttribute: this.getAttribute.bind(this),
        ...this.containerFunctions,
        showSelectOptionsNotification: this.showSelectOptionsNotification.bind(this)
    };

    getAttribute(code) {
        const { selectedFilters } = this.props;

        if (!Object.keys(selectedFilters).length) {
            const { product: { attributes = {} } } = this.props;

            return attributes[code];
        }

        const currentVariantIndex = this._getCurrentVariantIndex();
        const { product, product: { variants = [] } } = this.props;
        const { attributes: parentAttributes = {} } = product;
        const { attributes = parentAttributes } = variants[currentVariantIndex] || product;
        const { attribute_options = {} } = parentAttributes[code] || {};

        return {
            ...attributes[code],
            attribute_options
        };
    }

    containerProps() {
        const {
            children,
            mix,
            layout,
            device,
            hideCompareButton,
            hideWishlistButton,
            isLoading,
            isWishlistEnabled,
            renderContent,
            product,
            setSiblingsHaveBrands,
            setSiblingsHavePriceBadge,
            siblingsHaveBrands,
            siblingsHaveConfigurableOptions,
            siblingsHavePriceBadge,
            variant,
            configurableVariantIndex: orginalConfigurableVariantIndex
        } = this.props;

        const { configurableVariantIndex } = this.state;
        const configurableParameters = this._getConfigurableParameters();

        const parameters = configurableParameters
        && configurableParameters.parameters ? configurableParameters.parameters : {};

        return {
            ...super.containerProps(),
            children,
            hideCompareButton,
            hideWishlistButton,
            isLoading,
            layout,
            mix,
            product,
            isWishlistEnabled,
            device,
            renderContent,
            setSiblingsHaveBrands,
            setSiblingsHavePriceBadge,
            siblingsHaveBrands,
            siblingsHaveConfigurableOptions,
            siblingsHavePriceBadge,
            configurableVariantIndex: orginalConfigurableVariantIndex,
            parameters,
            currentVariantIndex: this._getCurrentVariantIndex(),
            productOrVariant: this._getProductOrVariant(),
            thumbnail: getSmallImage(this.getActiveProduct()) || getSmallImage(product),
            linkTo: this.getLinkTo(),
            inStock: getProductInStock(product, orginalConfigurableVariantIndex)
        };
    }

    getLinkTo() {
        const {
            baseLinkUrl,
            productUsesCategories,
            categoryUrlSuffix,
            product: { url, url_rewrites = [] },
            product
        } = this.props;
        const { pathname: storePrefix } = new URL(baseLinkUrl || window.location.origin);
        const { location: { pathname } } = history;

        if (!url) {
            return undefined;
        }

        const { parameters } = this._getConfigurableParameters();
        const { state: { category = null } = {} } = history.location;
        const categoryUrlPart = pathname.replace(storePrefix, '').replace(categoryUrlSuffix, '');
        const productUrl = `${categoryUrlPart}/${url.replace(storePrefix, '')}`;

        // if 'Product Use Categories' is enabled then use the current window location to see if the product
        // has any url_rewrite for that path. (if not then just use the default url)
        const rewriteUrl = url_rewrites.find(({ url }) => url.includes(productUrl)) || {};
        const rewriteUrlPath = productUsesCategories
            ? (rewriteUrl.url && appendWithStoreCode(rewriteUrl.url)) || url
            : url;

        return {
            pathname: rewriteUrlPath,
            state: { product, prevCategoryId: category },
            search: objectToUri(parameters)
        };
    }

    _getCurrentVariantIndex() {
        const { index } = this._getConfigurableParameters();
        return index;
    }

    _getConfigurableParameters() {
        const { product: { variants = [], configurable_options }, selectedFilters = {} } = this.props;
        const { configurableVariantIndex } = this.props;
        const filterKeys = Object.keys(selectedFilters);


        if (filterKeys.length === 0 && configurableVariantIndex === -1) {
            return { indexes: [], parameters: {} };
        }

        const indexes = getVariantsIndexes(variants, selectedFilters, true);
        const [index] = indexes;
        var newIndex = indexes;

        if(configurableVariantIndex > -1) {
            newIndex = configurableVariantIndex;
        }

        if (!variants[newIndex]) {
            return { indexes: [], parameters: {} };
        }
        const { attributes } = variants[newIndex];

        let parameters = Object.entries(attributes)
            .reduce((parameters, [key, { attribute_value }]) => {
                if (filterKeys.includes(key)) {
                    return { ...parameters, [key]: attribute_value };
                }

                return parameters;
            }, {});


        if(configurableVariantIndex > -1)  {
            parameters = Object.entries(attributes)
                .reduce((parameters, [key, { attribute_value }]) => {
                    if (Object.keys(configurable_options).includes(key)) {
                        return { ...parameters, [key]: attribute_value };
                    }

                    return parameters;
                }, {});
        }

        return { indexes, index: configurableVariantIndex > -1 ? configurableVariantIndex : index, parameters };
    }

    _isThumbnailAvailable(path) {
        return path && path !== 'no_selection';
    }

    _getThumbnail() {
        const product = this._getProductOrVariant();
        const { small_image: { url } = {} } = product;
        if (this._isThumbnailAvailable(url)) {
            return url;
        }

        // If thumbnail is, missing we try to get image from parent
        const { product: { small_image: { url: parentUrl } = {} } } = this.props;
        if (this._isThumbnailAvailable(parentUrl)) {
            return parentUrl;
        }

        return '';
    }

    _getProductOrVariant() {
        const { product: { type_id, variants }, product } = this.props;

        if (type_id === PRODUCT_TYPE.configurable && variants?.length) {
            return variants[this._getCurrentVariantIndex()] || product || {};
        }

        return product || {};
    }

    showSelectOptionsNotification() {
        const { showNotification } = this.props;

        showNotification('info', __('Please, select product options!'));
    }

    isConfigurableProductOutOfStock() {
        const { product: { variants = [] }, isPreview } = this.props;

        if (isPreview) {
            return true;
        }

        const variantsInStock = variants.filter((productVariant) => productVariant.stock_status === IN_STOCK);

        return variantsInStock.length === 0;
    }

    isBundleProductOutOfStock() {
        const { product: { items = [] } } = this.props;

        if (items.length === 0) {
            return true;
        }

        const { options } = items[0];

        const optionsInStock = options.filter((option) => option?.product?.stock_status === IN_STOCK);

        return optionsInStock.length === 0;
    }

    updateConfigurableVariant(key, value) {
        const { parameters: prevParameters } = this.state;

        const parameters = getNewParameters(prevParameters, key, value);
        this.setState({ parameters });

        this.updateConfigurableVariantIndex(parameters);
    }

    updateConfigurableVariantIndex(parameters) {
        const { product: { variants, configurable_options } } = this.props;
        const { configurableVariantIndex } = this.state;

        const newIndex = Object.keys(parameters).length === Object.keys(configurable_options).length
            ? getVariantIndex(variants, parameters)
            // Not all parameters are selected yet, therefore variantIndex must be invalid
            : -1;

        if (configurableVariantIndex !== newIndex) {
            this.setState({ configurableVariantIndex: newIndex });
        }
    }

    render() {
        return (
            <Subscribe to={ [SharedTransitionContainer] }>
                { ({ registerSharedElement }) => (
                    <ProductCard
                        { ...this.containerFunctions }
                        { ...this.containerProps() }
                        registerSharedElement={ registerSharedElement }
                    />
                ) }
            </Subscribe>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductCardContainer);
